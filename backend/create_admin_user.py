from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to MongoDB
client = MongoClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017/'))
db = client[os.getenv('DB_NAME', 'tomb_reus_db')]

# Create admin user
admin_user = {
    "email": "admin@reusapp.com",
    "password": pwd_context.hash("admin123"),
    "name": "Admin ReusApp",
    "role": "admin",
    "phone": "666000000",
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}

# Check if admin already exists
existing = db.users.find_one({"email": "admin@reusapp.com"})

if existing:
    print("⚠️  L'usuari admin ja existeix")
else:
    result = db.users.insert_one(admin_user)
    print("✅ Usuari admin creat correctament!")
    print(f"   ID: {result.inserted_id}")

print("\n📧 Credencials d'accés:")
print("   Email: admin@reusapp.com")
print("   Password: admin123")
print("\n🔐 Rol: ADMIN (accés total)")
