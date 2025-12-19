#!/usr/bin/env python3
"""
Script per exportar totes les dades de MongoDB local a fitxers JSON
per després importar-les a MongoDB Atlas (Railway)
"""

from pymongo import MongoClient
import json
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Custom JSON encoder per ObjectId i datetime
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def export_collection(db, collection_name, output_dir="mongodb_export"):
    """Exporta una col·lecció a JSON"""
    os.makedirs(output_dir, exist_ok=True)
    
    collection = db[collection_name]
    documents = list(collection.find())
    
    output_file = os.path.join(output_dir, f"{collection_name}.json")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, cls=MongoJSONEncoder, indent=2, ensure_ascii=False)
    
    print(f"✅ Exportat {len(documents)} documents de '{collection_name}' a {output_file}")
    return len(documents)

def main():
    print("🗄️  EXPORTACIÓ DE DADES MONGODB")
    print("=" * 50)
    
    # Connectar a MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    db_name = os.getenv('DB_NAME', 'tomb_reus_db')
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    # Obtenir llista de col·leccions
    collections = db.list_collection_names()
    print(f"\n📋 Col·leccions trobades: {len(collections)}")
    print(f"   {', '.join(collections)}\n")
    
    # Exportar cada col·lecció
    total_docs = 0
    for collection_name in collections:
        count = export_collection(db, collection_name)
        total_docs += count
    
    print("\n" + "=" * 50)
    print(f"✅ EXPORTACIÓ COMPLETADA!")
    print(f"📊 Total documents exportats: {total_docs}")
    print(f"📁 Fitxers guardats a: ./mongodb_export/")
    print("\n💡 Pròxim pas:")
    print("   1. Puja els fitxers JSON al teu servidor Railway")
    print("   2. Executa import_from_json.py amb la URL de MongoDB Atlas")

if __name__ == "__main__":
    main()
