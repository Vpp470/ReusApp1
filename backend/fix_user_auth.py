#!/usr/bin/env python3
"""
Script per arreglar problemes d'autenticació
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    
    email = "flapsreus@gmail.com"
    new_password = "flaps123"  # Contrasenya temporal
    
    user = await db.users.find_one({"email": email})
    
    if user:
        print(f"✅ Usuari trobat: {user['name']} ({email})")
        print(f"   Role: {user.get('role')}")
        print(f"   Created: {user.get('created_at')}")
        
        # Actualitzar contrasenya
        hashed_password = pwd_context.hash(new_password)
        await db.users.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}}
        )
        
        print(f"\n✅ Contrasenya actualitzada!")
        print(f"   Nova contrasenya: {new_password}")
        print(f"\nAra pots fer login amb:")
        print(f"   Email: {email}")
        print(f"   Password: {new_password}")
    else:
        print(f"❌ Usuari no trobat: {email}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
