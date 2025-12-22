#!/usr/bin/env python3
"""
Test script per l'endpoint d'estadístiques del backoffice
"""

import requests
import json
import sys

def test_admin_statistics():
    """Test de l'endpoint GET /api/admin/statistics"""
    
    # Configuració
    base_url = "https://admin-stats-fix-2.preview.emergentagent.com"
    endpoint = "/api/admin/statistics"
    admin_token = "i_yKBfolFbGsik3rMzPNVA5O6TyK5uzzAc-7YRQod-w"
    
    url = f"{base_url}{endpoint}"
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    print("🔍 TESTING ADMIN STATISTICS ENDPOINT")
    print("=" * 50)
    print(f"URL: {url}")
    print(f"Token: {admin_token}")
    print("=" * 50)
    
    try:
        # Fer la crida HTTP
        print("📡 Fent crida a l'endpoint...")
        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        # Verificar status code
        if response.status_code == 200:
            print("✅ Status Code 200 - OK")
        else:
            print(f"❌ Status Code {response.status_code} - ERROR")
            print(f"Response Text: {response.text}")
            return False
        
        # Verificar que és JSON vàlid
        try:
            data = response.json()
            print("✅ Resposta JSON vàlida")
        except json.JSONDecodeError as e:
            print(f"❌ Error parseant JSON: {e}")
            print(f"Response Text: {response.text}")
            return False
        
        # Mostrar resposta completa
        print("\n📄 RESPOSTA COMPLETA:")
        print("=" * 50)
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print("=" * 50)
        
        # Verificar seccions requerides
        required_sections = [
            "users", "establishments", "events", 
            "promotions", "raffles", "news", 
            "participations", "trends"
        ]
        
        print("\n🔍 VERIFICACIÓ DE SECCIONS:")
        print("-" * 30)
        
        missing_sections = []
        for section in required_sections:
            if section in data:
                print(f"✅ {section}: {data[section]}")
            else:
                print(f"❌ {section}: MISSING")
                missing_sections.append(section)
        
        if missing_sections:
            print(f"\n❌ Seccions que falten: {missing_sections}")
            return False
        else:
            print("\n✅ Totes les seccions requerides estan presents")
            return True
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de connexió: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperat: {e}")
        return False

if __name__ == "__main__":
    print("🚀 INICI DEL TEST D'ESTADÍSTIQUES ADMIN")
    print()
    
    success = test_admin_statistics()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 TEST COMPLETAT AMB ÈXIT!")
        sys.exit(0)
    else:
        print("💥 TEST FALLIT!")
        sys.exit(1)