#!/usr/bin/env python3
"""
Script per eliminar establiments duplicats de la base de dades
Manté el primer establiment i esborra els duplicats posteriors
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

def remove_duplicate_establishments():
    """Elimina establiments duplicats basant-se en el nom"""
    
    # Connectar a MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    db_name = os.getenv('DB_NAME', 'tomb_reus_db')
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    print("=" * 80)
    print("SCRIPT D'ELIMINACIÓ D'ESTABLIMENTS DUPLICATS")
    print("=" * 80)
    
    # Obtenir tots els establiments
    all_establishments = list(db.establishments.find({}))
    total_before = len(all_establishments)
    
    print(f"\n📊 Total d'establiments abans: {total_before}")
    
    # Agrupar per nom (case-insensitive)
    name_groups = defaultdict(list)
    
    for est in all_establishments:
        name = est.get('name', '').strip().lower()
        if name:
            name_groups[name].append(est)
    
    # Identificar duplicats
    duplicates_found = {name: ests for name, ests in name_groups.items() if len(ests) > 1}
    
    if not duplicates_found:
        print("\n✅ No s'han trobat duplicats!")
        return
    
    print(f"\n❌ S'han trobat {len(duplicates_found)} noms duplicats")
    print("\nExemples de duplicats:")
    print("-" * 80)
    
    count = 0
    for name, ests in sorted(duplicates_found.items(), key=lambda x: -len(x[1]))[:10]:
        count += 1
        original_name = ests[0].get('name', '')
        print(f"{count}. '{original_name}' - {len(ests)} vegades")
    
    if len(duplicates_found) > 10:
        print(f"... i {len(duplicates_found) - 10} més")
    
    # Demanar confirmació
    print("\n" + "=" * 80)
    print("⚠️  ATENCIÓ: Aquest procés eliminarà els establiments duplicats")
    print("   Es mantindrà el PRIMER establiment de cada grup")
    print("=" * 80)
    
    response = input("\nVols continuar? (escriu 'SÍ' per confirmar): ")
    
    if response.upper() != 'SÍ':
        print("\n❌ Operació cancel·lada")
        return
    
    # Eliminar duplicats
    total_deleted = 0
    
    print("\n🗑️  Eliminant duplicats...")
    print("-" * 80)
    
    for name, ests in duplicates_found.items():
        # Ordenar per _id (mantenir el més antic)
        ests_sorted = sorted(ests, key=lambda x: x['_id'])
        
        # Mantenir el primer, esborrar la resta
        to_keep = ests_sorted[0]
        to_delete = ests_sorted[1:]
        
        original_name = to_keep.get('name', '')
        print(f"• '{original_name}': Mantenint 1, esborrant {len(to_delete)}")
        
        # Esborrar els duplicats
        for est in to_delete:
            db.establishments.delete_one({'_id': est['_id']})
            total_deleted += 1
    
    # Recompte final
    total_after = db.establishments.count_documents({})
    
    print("\n" + "=" * 80)
    print("✅ PROCÉS COMPLETAT")
    print("=" * 80)
    print(f"📊 Establiments abans:  {total_before}")
    print(f"🗑️  Establiments esborrats: {total_deleted}")
    print(f"📊 Establiments després: {total_after}")
    print("=" * 80)
    
    client.close()

if __name__ == '__main__':
    try:
        remove_duplicate_establishments()
    except KeyboardInterrupt:
        print("\n\n❌ Operació cancel·lada per l'usuari")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
