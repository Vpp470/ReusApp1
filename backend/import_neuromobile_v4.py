"""
Script per importar dades de Neuromobile API v4
URL: https://webapidev.neuromobile.io/api/v4/commerces
"""

import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'tombdereus')
neuromobile_token = os.environ.get('NEUROMOBILE_TOKEN', '5YyWl7EacMj0ymCO7TnlcmVFckzmtA8g5ubn7NvwMaB3bUYZ0bTfssG81D6b')

# URL correcta de l'API
BASE_URL = "https://webapidev.neuromobile.io/api/v4"
CENTER_ID = 1  # El teu center_id

async def import_neuromobile_data():
    """Importa dades de Neuromobile API v4"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔄 Iniciant importació de Neuromobile API v4...")
    print(f"URL: {BASE_URL}")
    print(f"Center ID: {CENTER_ID}")
    
    headers = {
        "Authorization": f"Bearer {neuromobile_token}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json"
    }
    
    # 1. IMPORTAR ESTABLIMENTS (commerces)
    print("\n" + "="*60)
    print("📦 IMPORTACIÓ D'ESTABLIMENTS")
    print("="*60)
    
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as http_client:
            current_page = 1
            total_imported = 0
            per_page = 100  # Obtenir 100 per pàgina
            
            while True:
                url = f"{BASE_URL}/commerces?filter[center_id]={CENTER_ID}&page[number]={current_page}&page[size]={per_page}"
                
                print(f"\n📄 Pàgina {current_page}...")
                
                response = await http_client.get(url, headers=headers)
                
                if response.status_code != 200:
                    print(f"❌ Error {response.status_code}: {response.text[:200]}")
                    break
                
                data = response.json()
                commerces = data.get('data', [])
                meta = data.get('meta', {}).get('page', {})
                
                if not commerces:
                    print("✅ No hi ha més establiments")
                    break
                
                print(f"   Processant {len(commerces)} establiments...")
                
                for commerce in commerces:
                    attrs = commerce.get('attributes', {})
                    commerce_id = commerce.get('id')
                    
                    # Mapear camps de Neuromobile al nostre esquema
                    establishment_data = {
                        "external_id": str(commerce_id),
                        "name": attrs.get('name', 'Sense nom'),
                        "description": attrs.get('description', ''),
                        "category": "",  # S'obté de relationships/categories
                        "address": attrs.get('address', ''),
                        "latitude": attrs.get('latitude'),
                        "longitude": attrs.get('longitude'),
                        "phone": attrs.get('phone', ''),
                        "website": attrs.get('web-url', ''),
                        "image_url": attrs.get('image-url', ''),
                        "social_media": {
                            "facebook": attrs.get('facebook', ''),
                            "instagram": attrs.get('instagram', ''),
                            "twitter": attrs.get('twitter', ''),
                            "youtube": attrs.get('youtube', ''),
                            "linkedin": attrs.get('linkedin', ''),
                        },
                        "email": attrs.get('email', ''),
                        "whatsapp": attrs.get('whatsapp-phone', ''),
                        "imported_at": datetime.utcnow(),
                        "imported_from": "neuromobile_api_v4"
                    }
                    
                    # Guardar a MongoDB
                    result = await db.establishments.update_one(
                        {"external_id": establishment_data["external_id"]},
                        {"$set": establishment_data},
                        upsert=True
                    )
                    
                    if result.upserted_id or result.modified_count > 0:
                        total_imported += 1
                        print(f"   ✓ {establishment_data['name']}")
                
                # Comprovar si hi ha més pàgines
                current_page_num = meta.get('current-page', current_page)
                last_page = meta.get('last-page', current_page)
                
                print(f"   Pàgina {current_page_num} de {last_page}")
                
                if current_page_num >= last_page:
                    break
                
                current_page += 1
            
            print(f"\n✅ Total importats: {total_imported} establiments")
            
    except httpx.HTTPError as e:
        print(f"❌ Error HTTP: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # 2. IMPORTAR PROPOSTES (si l'endpoint existeix)
    print("\n" + "="*60)
    print("📦 IMPORTACIÓ DE PROPOSTES")
    print("="*60)
    
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as http_client:
            # Provar diferents endpoints per proposals
            proposals_endpoints = [
                f"{BASE_URL}/proposals?filter[center_id]={CENTER_ID}&page[size]=100",
                f"{BASE_URL}/offers?filter[center_id]={CENTER_ID}&page[size]=100",
                f"{BASE_URL}/promotions?filter[center_id]={CENTER_ID}&page[size]=100",
            ]
            
            proposals_imported = 0
            
            for endpoint in proposals_endpoints:
                print(f"\n🔍 Provant: {endpoint}")
                
                try:
                    response = await http_client.get(endpoint, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        proposals = data.get('data', [])
                        
                        if proposals:
                            print(f"✅ Trobades {len(proposals)} propostes")
                            
                            for proposal in proposals:
                                attrs = proposal.get('attributes', {})
                                proposal_id = proposal.get('id')
                                
                                offer_data = {
                                    "external_id": str(proposal_id),
                                    "establishment_id": "",  # S'obtindria de relationships
                                    "title": attrs.get('title', attrs.get('name', 'Sense títol')),
                                    "description": attrs.get('description', ''),
                                    "discount": attrs.get('discount', ''),
                                    "valid_from": attrs.get('valid-from', attrs.get('start-date', datetime.utcnow())),
                                    "valid_until": attrs.get('valid-until', attrs.get('end-date', datetime.utcnow())),
                                    "image_url": attrs.get('image-url', attrs.get('image', '')),
                                    "terms": attrs.get('terms', attrs.get('conditions', '')),
                                    "imported_at": datetime.utcnow(),
                                    "imported_from": "neuromobile_api_v4"
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
                                    proposals_imported += 1
                                    print(f"   ✓ {offer_data['title']}")
                            
                            break  # Sortir si hem trobat propostes
                    
                except Exception as e:
                    print(f"   ❌ Error: {str(e)[:100]}")
                    continue
            
            if proposals_imported > 0:
                print(f"\n✅ Total importades: {proposals_imported} propostes")
            else:
                print("\n⚠️  No s'han trobat propostes o l'endpoint no existeix")
                print("   Pot ser que les propostes estiguin en un altre endpoint")
                
    except Exception as e:
        print(f"❌ Error en importació de propostes: {e}")
    
    # Resum final
    total_establishments = await db.establishments.count_documents({})
    total_offers = await db.offers.count_documents({})
    
    print("\n" + "="*60)
    print("📊 RESUM TOTAL A LA BASE DE DADES:")
    print(f"   Establiments: {total_establishments}")
    print(f"   Ofertes: {total_offers}")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_neuromobile_data())
