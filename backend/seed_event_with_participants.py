"""
Script per crear un esdeveniment de prova amb establiments participants
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
import os

async def seed_event_with_participants():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'el_tomb_de_reus')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Creant esdeveniment de prova amb participants...")
    
    # 1. Crear 3 establiments de prova
    establishments_data = [
        {
            "name": "Restaurant Can Bolet",
            "description": "Cuina catalana tradicional",
            "category": "Restauració",
            "address": "Carrer Major, 25, Reus",
            "latitude": 41.1533,
            "longitude": 1.1073,
            "phone": "+34 977 111 111",
            "email": "canbolet@test.com",
            "website": "https://canbolet.com",
            "image_url": None,
            "social_media": {
                "facebook": "canbolet",
                "instagram": "@canbolet"
            },
            "visible_in_public_list": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Cafè del Centre",
            "description": "Els millors cafès i pastissos",
            "category": "Restauració",
            "address": "Plaça Prim, 10, Reus",
            "latitude": 41.1543,
            "longitude": 1.1083,
            "phone": "+34 977 222 222",
            "email": "cafedelcentre@test.com",
            "website": None,
            "image_url": None,
            "social_media": {
                "instagram": "@cafedelcentre"
            },
            "visible_in_public_list": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Bar El Racó",
            "description": "Tapes i vins locals",
            "category": "Restauració",
            "address": "Carrer de Sant Joan, 15, Reus",
            "latitude": 41.1523,
            "longitude": 1.1063,
            "phone": "+34 977 333 333",
            "email": "elraco@test.com",
            "website": "https://elraco.com",
            "image_url": None,
            "social_media": {
                "facebook": "elraco",
                "instagram": "@elraco"
            },
            "visible_in_public_list": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Inserir establiments
    result = await db.establishments.insert_many(establishments_data)
    establishment_ids = result.inserted_ids
    print(f"✅ Creats {len(establishment_ids)} establiments")
    for i, est_id in enumerate(establishment_ids):
        print(f"   - {establishments_data[i]['name']}: {est_id}")
    
    # 2. Crear esdeveniment amb participants
    event_data = {
        "title": "Sopars Màgics de Reus",
        "description": "Descobreix la gastronomia local amb menús especials en els millors restaurants de la ciutat. Cada establiment ofereix un menú únic amb productes de temporada.",
        "location": "Diversos establiments del centre de Reus",
        "category": "Gastronomia",
        "image_url": None,
        "valid_from": datetime.utcnow() - timedelta(days=1),  # Va començar ahir
        "valid_until": datetime.utcnow() + timedelta(days=30),  # Acaba d'aquí a 30 dies
        "participating_establishment_ids": [str(id) for id in establishment_ids],  # IDs com a strings
        "social_media": {
            "facebook": "soparsmagics",
            "instagram": "@soparsmagicsreus"
        },
        "created_at": datetime.utcnow()
    }
    
    result = await db.events.insert_one(event_data)
    event_id = result.inserted_id
    print(f"✅ Creat esdeveniment: {event_data['title']} (ID: {event_id})")
    print(f"   - Participants: {len(establishment_ids)} establiments")
    print(f"   - Valid des de: {event_data['valid_from']}")
    print(f"   - Valid fins: {event_data['valid_until']}")
    
    # 3. Verificar que tot estigui correcte
    print("\n🔍 Verificant dades...")
    
    # Comprovar esdeveniments
    events = await db.events.find({
        "valid_from": {"$exists": True},
        "valid_until": {"$gte": datetime.utcnow()}
    }).to_list(10)
    print(f"✅ Esdeveniments actius a la BD: {len(events)}")
    
    # Comprovar establiments
    establishments = await db.establishments.find({}).to_list(10)
    print(f"✅ Establiments a la BD: {len(establishments)}")
    
    print("\n🎉 Seed completat amb èxit!")
    print(f"\nPots provar l'esdeveniment amb ID: {event_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_event_with_participants())
