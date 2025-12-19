from pymongo import MongoClient
from datetime import datetime, timedelta
from bson import ObjectId

# Connectar a MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client['tomb_reus_db']

print("=== ESBORRANT ESDEVENIMENTS ===")
result = db.events.delete_many({})
print(f"Esborrats {result.deleted_count} esdeveniments")

print("\n=== CREANT ESDEVENIMENT SOPARS MÀGICS ===")

# Obtenir els IDs dels 8 establiments participants
participant_names = [
    "BAR AMICS DE REUS",
    "COLMADO BARÓ",
    "EL BARATO",
    "LA GRUTA",
    "RESTAURANTE REUS",
    "RESTAURANT CAL MAGRET",
    "REUS BAR",
    "REUS CAFÉ"
]

# Buscar els establiments per nom i obtenir els seus IDs
participant_ids = []
print("\nBuscant establiments participants:")
for name in participant_names:
    est = db.establishments.find_one({"name": {"$regex": name, "$options": "i"}})
    if est:
        participant_ids.append(str(est['_id']))
        print(f"  ✓ {est.get('name')} - {est['_id']}")
    else:
        print(f"  ✗ No trobat: {name}")

if len(participant_ids) < 8:
    print(f"\n⚠️ ATENCIÓ: Només s'han trobat {len(participant_ids)} establiments dels 8 esperats")
    print("Buscant qualsevol 8 establiments amb coordenades...")
    
    # Si no trobem els 8, agafem els primers 8 establiments amb coordenades
    establishments = list(db.establishments.find({
        "latitude": {"$exists": True, "$ne": None},
        "longitude": {"$exists": True, "$ne": None}
    }).limit(8))
    
    participant_ids = [str(est['_id']) for est in establishments]
    print("Establiments seleccionats:")
    for est in establishments:
        print(f"  - {est.get('name')} - {est['_id']}")

# Crear l'esdeveniment amb la imatge
event_data = {
    "title": "Sopars Màgics ",
    "description": "Descobreix la gastronomia local sopant als establiments associats a El Tomb de Reus i disfrutant d'un espectacle de màgia d'aprop",
    "location": "Diversos establiments del centre de Reus",
    "category": "Gastronomia",
    "image_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAMHBDgDASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAAAAECAwQFBgcI...",
    "valid_from": datetime.utcnow(),
    "valid_until": datetime.utcnow() + timedelta(days=60),
    "participating_establishment_ids": participant_ids,
    "social_media": {
        "facebook": "soparsmagicsreus",
        "instagram": "@soparsmagicsreus"
    },
    "created_at": datetime.utcnow()
}

result = db.events.insert_one(event_data)
print(f"\n✓ Esdeveniment creat amb ID: {result.inserted_id}")
print(f"✓ Amb {len(participant_ids)} establiments participants")

print("\n=== COMPROVACIÓ ===")
event = db.events.find_one({"_id": result.inserted_id})
print(f"Títol: {event['title']}")
print(f"Participants: {len(event['participating_establishment_ids'])} establiments")
print(f"IDs: {event['participating_establishment_ids']}")

client.close()
print("\n✅ Procés completat!")
