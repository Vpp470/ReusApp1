#!/usr/bin/env python3
"""
Import all data from local MongoDB export to MongoDB Atlas
"""

from pymongo import MongoClient
import json
import os
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Atlas connection string from environment
ATLAS_URL = os.getenv('MONGO_URL')

def convert_objectid(obj):
    """Convert string IDs back to ObjectId where needed"""
    if isinstance(obj, dict):
        if '_id' in obj and isinstance(obj['_id'], str):
            try:
                obj['_id'] = ObjectId(obj['_id'])
            except:
                pass
        for key, value in obj.items():
            obj[key] = convert_objectid(value)
    elif isinstance(obj, list):
        return [convert_objectid(item) for item in obj]
    return obj

def import_collection(db, collection_name, json_file):
    """Import a JSON file to MongoDB Atlas"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print(f"⚠️  {collection_name}: fitxer buit, saltant...")
            return 0
        
        # Convert string IDs to ObjectId
        data = convert_objectid(data)
        
        # Clear existing data
        db[collection_name].delete_many({})
        
        # Insert new data
        if isinstance(data, list):
            db[collection_name].insert_many(data)
            count = len(data)
        else:
            db[collection_name].insert_one(data)
            count = 1
        
        print(f"✅ {collection_name}: {count} documents importats")
        return count
    
    except Exception as e:
        print(f"❌ Error important {collection_name}: {e}")
        return 0

def main():
    print("=" * 60)
    print("🗄️  IMPORTACIÓ DE DADES A MONGODB ATLAS")
    print("=" * 60)
    print()
    
    # Connect to MongoDB Atlas
    print("🔗 Connectant a MongoDB Atlas...")
    try:
        client = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        print("✅ Connexió establerta amb èxit!")
        print()
    except Exception as e:
        print(f"❌ Error connectant a MongoDB Atlas: {e}")
        return
    
    db_name = os.getenv('DB_NAME', 'tomb_reus_db')
    db = client[db_name]
    
    # Get all JSON files
    export_dir = 'mongodb_export'
    json_files = [f for f in os.listdir(export_dir) if f.endswith('.json')]
    
    print(f"📁 Fitxers trobats: {len(json_files)}")
    print()
    
    # Import each collection
    total_docs = 0
    for json_file in sorted(json_files):
        collection_name = json_file.replace('.json', '')
        file_path = os.path.join(export_dir, json_file)
        count = import_collection(db, collection_name, file_path)
        total_docs += count
    
    print()
    print("=" * 60)
    print(f"✅ IMPORTACIÓ COMPLETADA!")
    print(f"📊 Total documents importats: {total_docs}")
    print(f"🗄️  Base de dades: tomb_reus_db")
    print(f"🌐 Servidor: MongoDB Atlas")
    print("=" * 60)

if __name__ == "__main__":
    main()
