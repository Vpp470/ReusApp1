import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.establishments.delete_many({})
    await db.offers.delete_many({})
    await db.events.delete_many({})
    await db.news.delete_many({})
    
    print("✅ Cleared existing data")
    
    # Crear usuari admin per defecte
    admin_emails = ["admin@eltombdereus.com", "vpp470@gmail.com"]
    
    for email in admin_emails:
        admin_user = await db.users.find_one({"email": email})
        if not admin_user:
            await db.users.insert_one({
                "email": email,
                "name": "Administrador" if email == "admin@eltombdereus.com" else "Admin VPP",
                "password": "admin123",  # TODO: Hash in production
                "role": "admin",
                "data_consent": True,
                "data_consent_date": datetime.utcnow(),
                "created_at": datetime.utcnow()
            })
            print(f"✅ Created admin user: {email} / admin123")
        else:
            # Actualitzar a admin si ja existeix
            await db.users.update_one(
                {"email": email},
                {"$set": {"role": "admin"}}
            )
            print(f"✅ Updated user {email} to admin role")
    
    # Seed Establishments
    establishments = [
        {
            "name": "Restaurante El Pati",
            "description": "Cocina tradicional catalana con productos de temporada",
            "category": "Restaurante",
            "address": "Carrer Major, 45, Reus",
            "latitude": 41.1533,
            "longitude": 1.1073,
            "phone": "+34 977 12 34 56",
            "website": "https://elpati.com",
            "image_url": None,
            "social_media": {
                "facebook": "elpat ireus",
                "instagram": "@elpatireus"
            }
        },
        {
            "name": "Cafetería Central",
            "description": "Café, pasteles y desayunos en el centro de Reus",
            "category": "Cafetería",
            "address": "Plaça del Mercadal, 12, Reus",
            "latitude": 41.1543,
            "longitude": 1.1083,
            "phone": "+34 977 23 45 67",
            "website": None,
            "image_url": None,
            "social_media": {}
        },
        {
            "name": "Tienda de Moda Trendy",
            "description": "Las últimas tendencias en moda para toda la familia",
            "category": "Moda",
            "address": "Carrer de Sant Joan, 23, Reus",
            "latitude": 41.1523,
            "longitude": 1.1063,
            "phone": "+34 977 34 56 78",
            "website": "https://trendy.com",
            "image_url": None,
            "social_media": {
                "instagram": "@trendyreus"
            }
        },
        {
            "name": "Librería Pages",
            "description": "Libros, papelería y material escolar",
            "category": "Librería",
            "address": "Carrer de la Mercè, 8, Reus",
            "latitude": 41.1553,
            "longitude": 1.1093,
            "phone": "+34 977 45 67 89",
            "website": None,
            "image_url": None,
            "social_media": {}
        },
        {
            "name": "Farmacia del Centro",
            "description": "Farmacia con amplio horario y servicio personalizado",
            "category": "Farmacia",
            "address": "Avinguda de Prat de la Riba, 56, Reus",
            "latitude": 41.1563,
            "longitude": 1.1053,
            "phone": "+34 977 56 78 90",
            "website": "https://farmaciacentro.com",
            "image_url": None,
            "social_media": {}
        }
    ]
    
    result = await db.establishments.insert_many(establishments)
    print(f"✅ Inserted {len(result.inserted_ids)} establishments")
    
    # Seed Offers
    establishment_ids = [str(id) for id in result.inserted_ids]
    
    offers = [
        {
            "establishment_id": establishment_ids[0],
            "title": "Menú del día 15% descuento",
            "description": "Disfruta de nuestro menú del día con un 15% de descuento presentando tu tarjeta regalo",
            "discount": "15% descuento",
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=30),
            "image_url": None,
            "terms": "Válido de lunes a viernes, no acumulable con otras promociones",
            "created_at": datetime.utcnow()
        },
        {
            "establishment_id": establishment_ids[1],
            "title": "2x1 en cafés",
            "description": "Compra un café y llévate otro gratis",
            "discount": "2x1",
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=60),
            "image_url": None,
            "terms": "Válido todos los días de 8:00 a 11:00",
            "created_at": datetime.utcnow()
        },
        {
            "establishment_id": establishment_ids[2],
            "title": "20% en nueva colección",
            "description": "Descuento del 20% en toda la nueva colección de primavera",
            "discount": "20% descuento",
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=45),
            "image_url": None,
            "terms": "No acumulable, válido hasta fin de existencias",
            "created_at": datetime.utcnow()
        },
        {
            "establishment_id": establishment_ids[3],
            "title": "10% en material escolar",
            "description": "Ahorra un 10% en todo el material escolar",
            "discount": "10% descuento",
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=90),
            "image_url": None,
            "terms": "Válido para compras superiores a 20€",
            "created_at": datetime.utcnow()
        },
        {
            "establishment_id": establishment_ids[4],
            "title": "Consulta gratuita",
            "description": "Consulta gratuita sobre salud y medicamentos",
            "discount": "Servicio gratuito",
            "valid_from": datetime.utcnow(),
            "valid_until": datetime.utcnow() + timedelta(days=120),
            "image_url": None,
            "terms": "Previa cita, sujeto a disponibilidad",
            "created_at": datetime.utcnow()
        }
    ]
    
    result = await db.offers.insert_many(offers)
    print(f"✅ Inserted {len(result.inserted_ids)} offers")
    
    # Seed Events
    events = [
        {
            "title": "Feria de Artesanía de Reus",
            "description": "Descubre los mejores productos artesanales locales en la plaza del Mercadal",
            "date": datetime.utcnow() + timedelta(days=7),
            "location": "Plaça del Mercadal, Reus",
            "image_url": None,
            "category": "Feria",
            "created_at": datetime.utcnow()
        },
        {
            "title": "Concierto de Jazz en el Centro",
            "description": "Disfruta de una noche de jazz con los mejores músicos locales",
            "date": datetime.utcnow() + timedelta(days=14),
            "location": "Teatro Fortuny, Reus",
            "image_url": None,
            "category": "Música",
            "created_at": datetime.utcnow()
        },
        {
            "title": "Ruta Gastronómica",
            "description": "Descubre los sabores de Reus en una ruta por los mejores restaurantes",
            "date": datetime.utcnow() + timedelta(days=21),
            "location": "Varios establecimientos, Reus",
            "image_url": None,
            "category": "Gastronomía",
            "created_at": datetime.utcnow()
        },
        {
            "title": "Día del Comercio Local",
            "description": "Apoya al comercio local con ofertas especiales en todos los establecimientos",
            "date": datetime.utcnow() + timedelta(days=28),
            "location": "Centro de Reus",
            "image_url": None,
            "category": "Comercio",
            "created_at": datetime.utcnow()
        }
    ]
    
    result = await db.events.insert_many(events)
    print(f"✅ Inserted {len(result.inserted_ids)} events")
    
    # Seed News
    news = [
        {
            "title": "Reus celebra la Festa Major 2025",
            "content": "La ciutat de Reus es prepara per celebrar la seva Festa Major amb un programa ple d'activitats culturals, musicals i tradicionals. Aquest any, la festa tindrà lloc del 25 al 29 de juny.",
            "author": "Ajuntament de Reus",
            "image_url": None,
            "category": "Cultura",
            "published": True,
            "created_at": datetime.utcnow() - timedelta(days=2),
            "updated_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "title": "Nova zona comercial al centre històric",
            "content": "El centre històric de Reus estrena una nova zona comercial amb més de 20 establiments. La zona ofereix una experiència única amb botigues de proximitat i restaurants tradicionals.",
            "author": "Redacció El Tomb",
            "image_url": None,
            "category": "Comerç",
            "published": True,
            "created_at": datetime.utcnow() - timedelta(days=5),
            "updated_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "title": "Reus Capital del Vermut",
            "content": "Reus ha estat designada Capital del Vermut 2025. Durant tot l'any es realitzaran activitats per promocionar aquesta beguda tradicional catalana i el seu paper en la cultura local.",
            "author": "Oficina de Turisme",
            "image_url": None,
            "category": "Gastronomia",
            "published": True,
            "created_at": datetime.utcnow() - timedelta(days=10),
            "updated_at": datetime.utcnow() - timedelta(days=10)
        }
    ]
    
    result = await db.news.insert_many(news)
    print(f"✅ Inserted {len(result.inserted_ids)} news articles")
    
    print("\n🎉 Database seeding completed!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
