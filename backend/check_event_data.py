from pymongo import MongoClient
import os

# Usar directament la URL de MongoDB
MONGO_URL = "mongodb://localhost:27017/"

client = MongoClient(MONGO_URL)
db = client['tomb_reus_db']

# Buscar l'esdeveniment Sopars Màgics
event = db.events.find_one({'title': 'Sopars Màgics'})

if event:
    print("=== ESDEVENIMENT SOPARS MÀGICS ===")
    print(f"Event ID: {event['_id']}")
    print(f"Event ID type: {type(event['_id'])}")
    print(f"\nParticipant IDs:")
    for pid in event.get('participating_establishment_ids', []):
        print(f"  - {pid} (type: {type(pid)})")
    
    print("\n=== ALGUNS ESTABLIMENTS ===")
    # Obtenir alguns establiments per veure el format dels seus IDs
    establishments = list(db.establishments.find().limit(3))
    for est in establishments:
        print(f"Name: {est.get('name')}")
        print(f"  _id: {est['_id']} (type: {type(est['_id'])})")
        if 'id' in est:
            print(f"  id: {est['id']} (type: {type(est['id'])})")
        print()
else:
    print("Esdeveniment 'Sopars Màgics' no trobat")

client.close()
