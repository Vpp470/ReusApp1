import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def init_roles():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔧 Inicialitzant rols del sistema...")
    
    # Rols predefinits
    system_roles = [
        {
            "code": "admin",
            "name": "Administrador",
            "description": "Accés complet al sistema i backoffice",
            "color": "#DC2626",  # Vermell
            "permissions": ["all"],
            "is_system": True,
            "created_at": datetime.utcnow()
        },
        {
            "code": "user",
            "name": "Usuari",
            "description": "Usuari estàndard de l'aplicació",
            "color": "#10B981",  # Verd
            "permissions": ["view_content", "scan_tickets", "purchase_gift_cards"],
            "is_system": True,
            "created_at": datetime.utcnow()
        },
        {
            "code": "local_associat",
            "name": "Local Associat",
            "description": "Establiment associat a El Tomb de Reus",
            "color": "#F59E0B",  # Taronja
            "permissions": ["view_content", "scan_tickets", "manage_own_establishment"],
            "is_system": False,
            "created_at": datetime.utcnow()
        },
        {
            "code": "entitat_colaboradora",
            "name": "Entitat Col·laboradora",
            "description": "Entitat o patrocinador col·laborador",
            "color": "#8B5CF6",  # Morat
            "permissions": ["view_content", "create_events", "create_news"],
            "is_system": False,
            "created_at": datetime.utcnow()
        }
    ]
    
    for role in system_roles:
        existing = await db.roles.find_one({"code": role["code"]})
        if not existing:
            await db.roles.insert_one(role)
            print(f"✅ Creat rol: {role['name']} ({role['code']})")
        else:
            print(f"ℹ️  Rol ja existeix: {role['name']} ({role['code']})")
    
    # Actualitzar usuaris existents amb rols
    users_without_role = await db.users.find({"role": {"$exists": False}}).to_list(None)
    for user in users_without_role:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"role": "user"}}
        )
    
    if users_without_role:
        print(f"✅ Actualitzats {len(users_without_role)} usuaris sense rol a 'user'")
    
    print("\n🎉 Rols inicialitzats correctament!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_roles())
