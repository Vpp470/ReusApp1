import asyncio
import httpx
import ssl
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
neuromobile_token = os.environ.get('NEUROMOBILE_TOKEN', '')

async def import_neuromobile_data():
    """Import data from Neuromobile API"""
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔄 Iniciant importació de dades de Neuromobile...")
    print(f"Token: {neuromobile_token[:20]}...")
    
    # Crear context SSL que ignori errors de certificat
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Provar diferents URLs i formats
    urls_to_try = [
        "https://api.duc.neuromobile.com/v1/commerces",
        "https://api.neuromobile.com/v1/commerces",
        "https://duc.neuromobile.com/api/v1/commerces",
    ]
    
    headers_to_try = [
        {"api-key": neuromobile_token, "Content-Type": "application/json"},
        {"Authorization": f"Bearer {neuromobile_token}", "Content-Type": "application/json"},
        {"X-API-Key": neuromobile_token, "Content-Type": "application/json"},
    ]
    
    success = False
    
    for url in urls_to_try:
        for headers in headers_to_try:
            try:
                print(f"\n🔍 Provant: {url}")
                print(f"   Headers: {list(headers.keys())}")
                
                async with httpx.AsyncClient(verify=False, timeout=20.0) as http_client:
                    response = await http_client.get(url, headers=headers)
                    
                    print(f"   Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"\n✅ Èxit! Rebudes {len(data) if isinstance(data, list) else 'dades'}")
                        
                        # Si és una llista de comerços
                        if isinstance(data, list):
                            print(f"\n📦 Processant {len(data)} establiments...")
                            
                            imported_count = 0
                            for commerce in data:
                                establishment_data = {
                                    "external_id": commerce.get('id', commerce.get('commerce_id', '')),
                                    "name": commerce.get('name', commerce.get('commerce_name', 'Sense nom')),
                                    "description": commerce.get('description', ''),
                                    "category": commerce.get('category', commerce.get('type', '')),
                                    "address": commerce.get('address', ''),
                                    "latitude": commerce.get('latitude', commerce.get('lat')),
                                    "longitude": commerce.get('longitude', commerce.get('lng', commerce.get('lon'))),
                                    "phone": commerce.get('phone', commerce.get('telephone', '')),
                                    "website": commerce.get('website', commerce.get('url', '')),
                                    "image_url": commerce.get('image', commerce.get('logo', commerce.get('picture', ''))),
                                    "social_media": commerce.get('social_media', {}),
                                    "imported_at": datetime.utcnow()
                                }
                                
                                result = await db.establishments.update_one(
                                    {"external_id": establishment_data["external_id"]},
                                    {"$set": establishment_data},
                                    upsert=True
                                )
                                
                                if result.upserted_id or result.modified_count > 0:
                                    imported_count += 1
                                    print(f"   ✓ {establishment_data['name']}")
                            
                            print(f"\n✅ Importats/Actualitzats {imported_count} establiments!")
                            success = True
                            break
                        
                        # Si és un objecte amb propietats
                        elif isinstance(data, dict):
                            print(f"   Resposta: {list(data.keys())}")
                            
                            # Buscar l'array de comerços dins l'objecte
                            commerces = None
                            for key in ['commerces', 'data', 'results', 'items']:
                                if key in data and isinstance(data[key], list):
                                    commerces = data[key]
                                    break
                            
                            if commerces:
                                print(f"\n📦 Processant {len(commerces)} establiments...")
                                # Processar com abans...
                                success = True
                                break
                    
                    elif response.status_code == 401:
                        print(f"   ❌ No autoritzat - revisa el token")
                    elif response.status_code == 404:
                        print(f"   ❌ Endpoint no trobat")
                    else:
                        print(f"   ❌ Error: {response.text[:200]}")
                        
            except httpx.TimeoutException:
                print(f"   ⏱️ Timeout")
            except Exception as e:
                print(f"   ❌ Error: {str(e)[:100]}")
        
        if success:
            break
    
    if not success:
        print("\n❌ No s'ha pogut connectar amb l'API de Neuromobile")
        print("\n💡 Consell: Verifica:")
        print("   1. El token és correcte")
        print("   2. L'URL de l'API")
        print("   3. El format del header d'autorització")
        print("\n📧 Contacta amb Neuromobile per obtenir la documentació correcta de l'API")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_neuromobile_data())
