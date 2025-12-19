"""
Script per importar dades de Neuromobile des d'un arxiu JSON

Com utilitzar-lo:
1. Descarrega les dades de Neuromobile manualment:
   - Commerces: https://neuromobile.readme.io/reference/list-commerces
   - Proposals: https://neuromobile.readme.io/reference/list-proposal
   
2. Desa-les en arxius JSON:
   - /app/backend/data/commerces.json
   - /app/backend/data/proposals.json

3. Executa: python import_from_json.py
"""

import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def import_from_json():
    """Importa dades des d'arxius JSON"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("📦 Iniciant importació de dades des d'arxius JSON...")
    
    # Crear directori de dades si no existeix
    data_dir = ROOT_DIR / 'data'
    data_dir.mkdir(exist_ok=True)
    
    # 1. IMPORTAR ESTABLIMENTS (commerces)
    commerces_file = data_dir / 'commerces.json'
    if commerces_file.exists():
        print(f"\n✅ Trobat: {commerces_file}")
        
        with open(commerces_file, 'r', encoding='utf-8') as f:
            commerces_data = json.load(f)
        
        # Si és un objecte amb una clau 'data' o 'commerces'
        if isinstance(commerces_data, dict):
            for key in ['data', 'commerces', 'results', 'items']:
                if key in commerces_data:
                    commerces_data = commerces_data[key]
                    break
        
        if isinstance(commerces_data, list):
            print(f"📊 Processant {len(commerces_data)} establiments...")
            
            imported = 0
            for commerce in commerces_data:
                # Mapear camps de Neuromobile al nostre esquema
                establishment_data = {
                    "external_id": str(commerce.get('id', commerce.get('commerce_id', ''))),
                    "name": commerce.get('name', commerce.get('commerce_name', 'Sense nom')),
                    "description": commerce.get('description', ''),
                    "category": commerce.get('category', commerce.get('type', '')),
                    "address": commerce.get('address', commerce.get('location', '')),
                    "latitude": commerce.get('latitude', commerce.get('lat')),
                    "longitude": commerce.get('longitude', commerce.get('lng', commerce.get('lon'))),
                    "phone": commerce.get('phone', commerce.get('telephone', '')),
                    "website": commerce.get('website', commerce.get('url', '')),
                    "image_url": commerce.get('image', commerce.get('logo', commerce.get('picture', ''))),
                    "social_media": commerce.get('social_media', commerce.get('social', {})),
                    "imported_at": datetime.utcnow(),
                    "imported_from": "json"
                }
                
                result = await db.establishments.update_one(
                    {"external_id": establishment_data["external_id"]},
                    {"$set": establishment_data},
                    upsert=True
                )
                
                if result.upserted_id or result.modified_count > 0:
                    imported += 1
                    print(f"   ✓ {establishment_data['name']}")
            
            print(f"\n✅ Importats {imported} establiments!")
        else:
            print(f"❌ Format incorrecte: esperava una llista, trobat {type(commerces_data)}")
    else:
        print(f"\n⚠️  No trobat: {commerces_file}")
        print(f"   Desa les dades de commerces en aquest arxiu")
    
    # 2. IMPORTAR PROPOSTES/OFERTES (proposals)
    proposals_file = data_dir / 'proposals.json'
    if proposals_file.exists():
        print(f"\n✅ Trobat: {proposals_file}")
        
        with open(proposals_file, 'r', encoding='utf-8') as f:
            proposals_data = json.load(f)
        
        # Si és un objecte amb una clau 'data' o 'proposals'
        if isinstance(proposals_data, dict):
            for key in ['data', 'proposals', 'results', 'items']:
                if key in proposals_data:
                    proposals_data = proposals_data[key]
                    break
        
        if isinstance(proposals_data, list):
            print(f"📊 Processant {len(proposals_data)} ofertes...")
            
            imported = 0
            for proposal in proposals_data:
                # Mapear camps de Neuromobile al nostre esquema
                offer_data = {
                    "external_id": str(proposal.get('id', proposal.get('proposal_id', ''))),
                    "establishment_id": str(proposal.get('commerce_id', proposal.get('establishment_id', ''))),
                    "title": proposal.get('title', proposal.get('name', 'Sense títol')),
                    "description": proposal.get('description', ''),
                    "discount": proposal.get('discount', proposal.get('offer', '')),
                    "valid_from": proposal.get('valid_from', proposal.get('start_date', datetime.utcnow())),
                    "valid_until": proposal.get('valid_until', proposal.get('end_date', datetime.utcnow())),
                    "image_url": proposal.get('image', proposal.get('picture', '')),
                    "terms": proposal.get('terms', proposal.get('conditions', '')),
                    "imported_at": datetime.utcnow(),
                    "imported_from": "json"
                }
                
                # Convertir dates si són strings
                for date_field in ['valid_from', 'valid_until']:
                    if isinstance(offer_data[date_field], str):
                        try:
                            offer_data[date_field] = datetime.fromisoformat(offer_data[date_field].replace('Z', '+00:00'))
                        except:
                            offer_data[date_field] = datetime.utcnow()
                
                result = await db.offers.update_one(
                    {"external_id": offer_data["external_id"]},
                    {"$set": offer_data},
                    upsert=True
                )
                
                if result.upserted_id or result.modified_count > 0:
                    imported += 1
                    print(f"   ✓ {offer_data['title']}")
            
            print(f"\n✅ Importades {imported} ofertes!")
        else:
            print(f"❌ Format incorrecte: esperava una llista, trobat {type(proposals_data)}")
    else:
        print(f"\n⚠️  No trobat: {proposals_file}")
        print(f"   Desa les dades de proposals en aquest arxiu")
    
    # Resum final
    total_establishments = await db.establishments.count_documents({})
    total_offers = await db.offers.count_documents({})
    
    print(f"\n{'='*60}")
    print(f"📊 RESUM TOTAL A LA BASE DE DADES:")
    print(f"   Establiments: {total_establishments}")
    print(f"   Ofertes: {total_offers}")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_from_json())
