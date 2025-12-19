"""
Script complet per importar establiments des d'Excel amb tots els camps
Inclou: coordenades GPS, NIF, WhatsApp, social media, descripció completa, etc.
Actualitza els establiments existents si ja existeixen.
"""

import pandas as pd
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

# Connexió a MongoDB
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'eltombdereus')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def clean_value(value):
    """Netejar valors NaN i buits"""
    if pd.isna(value):
        return None
    value_str = str(value).strip()
    if value_str in ['nan', '', 'NaT', 'None']:
        return None
    return value_str

def clean_float(value):
    """Netejar valors float"""
    if pd.isna(value):
        return None
    try:
        return float(value)
    except:
        return None

def extract_social_media(row):
    """Extreure URLs de xarxes socials del DataFrame"""
    social_media = {}
    
    # Facebook
    facebook = clean_value(row.get('Facebook')) or clean_value(row.get('facebook')) or clean_value(row.get('FB'))
    if facebook:
        social_media['facebook'] = facebook
    
    # Instagram
    instagram = clean_value(row.get('Instagram')) or clean_value(row.get('instagram')) or clean_value(row.get('IG'))
    if instagram:
        social_media['instagram'] = instagram
    
    # Twitter/X
    twitter = clean_value(row.get('Twitter')) or clean_value(row.get('twitter')) or clean_value(row.get('X'))
    if twitter:
        social_media['twitter'] = twitter
    
    # YouTube
    youtube = clean_value(row.get('YouTube')) or clean_value(row.get('youtube')) or clean_value(row.get('Youtube'))
    if youtube:
        social_media['youtube'] = youtube
    
    return social_media if social_media else None

async def import_establishment_from_row(row, index):
    """
    Importar o actualitzar un establiment des d'una fila d'Excel
    """
    try:
        # Camp obligatori: Nom
        name = clean_value(row.get('Nom')) or clean_value(row.get('nom')) or clean_value(row.get('Nom establiment'))
        
        if not name:
            return {'status': 'skipped', 'reason': 'Nom buit', 'index': index}
        
        # NIF/CIF (vat_number = NIF)
        nif = clean_value(row.get('NIF')) or clean_value(row.get('nif')) or clean_value(row.get('CIF')) or clean_value(row.get('cif')) or clean_value(row.get('NIF/CIF')) or clean_value(row.get('vat_number')) or clean_value(row.get('Vat_number')) or clean_value(row.get('VAT_number')) or clean_value(row.get('vad number')) or clean_value(row.get('Vad number')) or clean_value(row.get('VAD number'))
        
        # Buscar si ja existeix (per NIF primer, després per nom)
        existing = None
        if nif:
            existing = await db.establishments.find_one({"nif": nif})
        if not existing:
            existing = await db.establishments.find_one({"name": name})
        
        # Preparar dades de l'establiment
        establishment_data = {
            "name": name,
            "commercial_name": clean_value(row.get('Nom comercial')) or clean_value(row.get('nom_comercial')),
            "nif": nif,
            "category": clean_value(row.get('Categoria')) or clean_value(row.get('categoria')),
            "subcategory": clean_value(row.get('Subcategoria')) or clean_value(row.get('subcategoria')) or clean_value(row.get('Tipus')),
            "description": clean_value(row.get('Descripció')) or clean_value(row.get('descripció')) or clean_value(row.get('Descripció completa')),
            "address": clean_value(row.get('Adreça')) or clean_value(row.get('adreça')) or clean_value(row.get('Direcció')),
            "phone": clean_value(row.get('Telèfon')) or clean_value(row.get('telèfon')) or clean_value(row.get('Telèfon de contacte')) or clean_value(row.get('Telefon')),
            "whatsapp": clean_value(row.get('WhatsApp')) or clean_value(row.get('whatsapp')) or clean_value(row.get('Whatsapp')),
            "email": clean_value(row.get('E-mail')) or clean_value(row.get('e-mail')) or clean_value(row.get('Email')) or clean_value(row.get('Correu electrònic')),
            "website": clean_value(row.get('Web')) or clean_value(row.get('web')) or clean_value(row.get('Adreça web')) or clean_value(row.get('Website')),
            "image_url": clean_value(row.get('Logo URL')) or clean_value(row.get('logo_url')) or clean_value(row.get('Imatge')) or clean_value(row.get('URL Logo')),
            "latitude": clean_float(row.get('Latitud')) or clean_float(row.get('latitud')) or clean_float(row.get('Lat')) or clean_float(row.get('latitut')),
            "longitude": clean_float(row.get('Longitud')) or clean_float(row.get('longitud')) or clean_float(row.get('Lng')) or clean_float(row.get('Lon')) or clean_float(row.get('longitut')),
            "social_media": extract_social_media(row),
            "updated_at": datetime.utcnow(),
        }
        
        # Camps addicionals que poden existir
        additional_fields = [
            'external_id', 'partner_id', 'video_url', 'horari', 'horario',
            'destacat', 'actiu', 'activo', 'ordre', 'order', 'programa_expogo',
            'programa_gaudeix', 'programa_navidad', 'programa_rebaixes'
        ]
        
        for field in additional_fields:
            value = clean_value(row.get(field)) or clean_value(row.get(field.capitalize()))
            if value:
                # Convertir a booleà si és necessari
                if field in ['destacat', 'actiu', 'activo', 'programa_expogo', 'programa_gaudeix', 'programa_navidad', 'programa_rebaixes']:
                    value = value.lower() in ['si', 'sí', 'yes', 'true', '1', 'x']
                establishment_data[field] = value
        
        # Netejar valors None
        establishment_data = {k: v for k, v in establishment_data.items() if v is not None}
        
        # ACTUALITZAR o CREAR
        if existing:
            # Actualitzar establiment existent
            establishment_data['updated_at'] = datetime.utcnow()
            
            await db.establishments.update_one(
                {"_id": existing["_id"]},
                {"$set": establishment_data}
            )
            
            print(f"  🔄 ACTUALITZAT: {name} (NIF: {nif or 'N/A'})")
            return {
                'status': 'updated',
                'name': name,
                'nif': nif,
                'index': index
            }
        else:
            # Crear nou establiment
            establishment_data['created_at'] = datetime.utcnow()
            
            result = await db.establishments.insert_one(establishment_data)
            
            print(f"  ✅ CREAT: {name} (NIF: {nif or 'N/A'})")
            return {
                'status': 'created',
                'name': name,
                'nif': nif,
                'index': index,
                'id': str(result.inserted_id)
            }
            
    except Exception as e:
        print(f"  ❌ ERROR fila {index}: {str(e)}")
        return {
            'status': 'error',
            'reason': str(e),
            'index': index
        }

async def import_from_excel(file_path):
    """
    Funció principal per importar des d'Excel
    """
    print("🚀 IMPORTACIÓ COMPLETA D'ESTABLIMENTS DES D'EXCEL")
    print(f"📁 Fitxer: {file_path}\n")
    
    try:
        # Llegir Excel
        df = pd.read_excel(file_path)
        
        print(f"📊 Columnes detectades ({len(df.columns)}):")
        for i, col in enumerate(df.columns, 1):
            print(f"   {i}. {col}")
        print(f"\n📝 Total files: {len(df)}\n")
        
        # Estadístiques
        created = 0
        updated = 0
        skipped = 0
        errors = 0
        error_details = []
        
        # Processar cada fila
        for index, row in df.iterrows():
            result = await import_establishment_from_row(row, index + 2)  # +2 per Excel (header + 1-indexed)
            
            if result['status'] == 'created':
                created += 1
            elif result['status'] == 'updated':
                updated += 1
            elif result['status'] == 'skipped':
                skipped += 1
            elif result['status'] == 'error':
                errors += 1
                error_details.append(result)
        
        # Resum final
        print(f"\n" + "="*60)
        print(f"📊 RESUM DE LA IMPORTACIÓ")
        print(f"="*60)
        print(f"  ✅ Creats:        {created}")
        print(f"  🔄 Actualitzats:  {updated}")
        print(f"  ⚠️  Saltats:       {skipped}")
        print(f"  ❌ Errors:        {errors}")
        print(f"  📈 TOTAL:         {created + updated + skipped + errors}")
        print(f"="*60)
        
        if error_details:
            print(f"\n⚠️  ERRORS DETALLATS:")
            for err in error_details[:10]:  # Mostrar primers 10
                print(f"   Fila {err['index']}: {err.get('reason', 'Unknown error')}")
        
        # Estadístiques finals de la BD
        total_db = await db.establishments.count_documents({})
        with_nif = await db.establishments.count_documents({"nif": {"$ne": None, "$exists": True}})
        with_coords = await db.establishments.count_documents({
            "latitude": {"$ne": None, "$exists": True},
            "longitude": {"$ne": None, "$exists": True}
        })
        
        print(f"\n📈 ESTADÍSTIQUES DE LA BASE DE DADES:")
        print(f"   Total establiments:      {total_db}")
        print(f"   Amb NIF:                 {with_nif}")
        print(f"   Amb coordenades GPS:     {with_coords}")
        
        return {
            "success": True,
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": errors,
            "total": total_db
        }
        
    except Exception as e:
        print(f"❌ ERROR CRÍTIC: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

async def main():
    """
    Punt d'entrada principal
    """
    # Ruta al fitxer Excel - CANVIAR SEGONS NECESSITAT
    excel_file = "/tmp/establiments.xlsx"
    
    # També buscar a altres ubicacions comunes
    possible_paths = [
        "/tmp/establiments.xlsx",
        "/app/backend/establiments.xlsx",
        "/tmp/2025-10_JPS_BD_establiments_eltomb_expogo_V02.xlsx",
        "/app/2025-10_JPS_BD_establiments_eltomb_expogo_V02.xlsx"
    ]
    
    file_found = None
    for path in possible_paths:
        if os.path.exists(path):
            file_found = path
            break
    
    if not file_found:
        print(f"❌ ERROR: No s'ha trobat cap fitxer Excel.")
        print(f"   Ubicacions provades:")
        for p in possible_paths:
            print(f"   - {p}")
        print(f"\n💡 Col·loca el fitxer Excel a una d'aquestes ubicacions i torna a executar.")
        return
    
    print(f"✅ Fitxer trobat: {file_found}\n")
    
    # Executar importació
    await import_from_excel(file_found)
    
    # Tancar connexió
    client.close()
    print(f"\n✅ IMPORTACIÓ FINALITZADA!")

if __name__ == "__main__":
    asyncio.run(main())
