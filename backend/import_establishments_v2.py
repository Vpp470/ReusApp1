"""
Script per importar establiments des del PDF actualitzat amb tots els camps
Descarrega logos, neteja i valida dades
"""

import asyncio
import re
import base64
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

# Connectar a MongoDB
client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME', 'tomb_reus_db')]


def clean_phone(phone: str) -> str:
    """Neteja i valida número de telèfon"""
    if not phone:
        return ""
    # Eliminar espais, guions, parèntesis
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    # Assegurar que comença amb +34
    if phone.startswith('34') and len(phone) == 11:
        phone = '+' + phone
    elif phone.startswith('6') or phone.startswith('7') or phone.startswith('9'):
        phone = '+34' + phone
    return phone


def clean_email(email: str) -> str:
    """Valida email"""
    if not email:
        return ""
    email = email.strip().lower()
    # Validació bàsica
    if '@' in email and '.' in email:
        return email
    return ""


def clean_nif(nif: str) -> str:
    """Neteja i valida NIF/CIF"""
    if not nif:
        return ""
    # Eliminar espais i guions
    nif = re.sub(r'[\s\-]', '', nif).upper()
    # Validar format (lletra+números o números+lletra)
    if re.match(r'^[A-Z]\d{8}$|^\d{8}[A-Z]$', nif):
        return nif
    return nif  # Retornar igualment si no coincideix exactament


def clean_url(url: str) -> str:
    """Neteja URL"""
    if not url:
        return ""
    url = url.strip()
    # Assegurar que comença amb http
    if url and not url.startswith('http'):
        url = 'https://' + url
    return url


def clean_postal_code(postal_code: str) -> str:
    """Neteja codi postal"""
    if not postal_code:
        return ""
    # Només números
    postal_code = re.sub(r'\D', '', postal_code)
    # Codis postals espanyols tenen 5 dígits
    if len(postal_code) == 5:
        return postal_code
    return postal_code


def extract_social_media(row_data: dict) -> dict:
    """Extreu i organitza enllaços de xarxes socials"""
    social_media = {}
    
    # Facebook
    if row_data.get('facebook') or row_data.get('facebook_url'):
        fb_url = row_data.get('facebook_url') or row_data.get('facebook', '')
        if fb_url:
            social_media['facebook'] = clean_url(fb_url)
    
    # Instagram
    if row_data.get('instagram') or row_data.get('instagram_url'):
        ig_url = row_data.get('instagram_url') or row_data.get('instagram', '')
        if ig_url:
            social_media['instagram'] = clean_url(ig_url)
    
    # Twitter
    if row_data.get('twitter') or row_data.get('twitter_url'):
        tw_url = row_data.get('twitter_url') or row_data.get('twitter', '')
        if tw_url:
            social_media['twitter'] = clean_url(tw_url)
    
    # YouTube
    if row_data.get('youtube'):
        social_media['youtube'] = clean_url(row_data.get('youtube', ''))
    
    return social_media if social_media else None


async def download_logo(url: str) -> str:
    """Descarrega logo des d'una URL i el retorna com a base64"""
    if not url:
        return ""
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code == 200:
                # Detectar tipus d'imatge
                content_type = response.headers.get('content-type', 'image/jpeg')
                image_data = response.content
                
                # Verificar que és una imatge
                if not content_type.startswith('image/'):
                    print(f"❌ URL no és una imatge: {content_type}")
                    return url  # Retornar URL original
                
                # Convertir a base64
                base64_image = base64.b64encode(image_data).decode('utf-8')
                return f"data:{content_type};base64,{base64_image}"
            else:
                print(f"❌ Error descarregant logo {url}: {response.status_code}")
                return url  # Retornar URL original si falla
    except Exception as e:
        print(f"❌ Error descarregant logo {url}: {str(e)}")
        return url  # Retornar URL original si falla


async def import_establishment(row_data: dict):
    """Importa un establiment netejant i validant dades"""
    
    # Camps obligatoris
    name = row_data.get('name', '').strip()
    if not name:
        print("❌ Establiment sense nom, es salta")
        return
    
    # Comprovar si ja existeix
    existing = await db.establishments.find_one({"name": name})
    if existing:
        print(f"⚠️  '{name}' ja existeix, s'actualitza")
        operation = 'update'
    else:
        operation = 'insert'
    
    # Neteja i validació de camps
    phone = clean_phone(row_data.get('phone', ''))
    email = clean_email(row_data.get('email', ''))
    nif = clean_nif(row_data.get('nif', ''))
    postal_code = clean_postal_code(row_data.get('postal_code', ''))
    website = clean_url(row_data.get('website', ''))
    google_maps_url = clean_url(row_data.get('google_maps_url', ''))
    video_url = clean_url(row_data.get('video_url', ''))
    
    # Descarregar logo
    logo_url = row_data.get('logo_url', '')
    image_base64 = ""
    if logo_url:
        print(f"📥 Descarregant logo per '{name}'...")
        image_base64 = await download_logo(logo_url)
        if image_base64:
            print(f"✅ Logo descarregat correctament")
        else:
            print(f"⚠️  No s'ha pogut descarregar el logo")
    
    # Extreure xarxes socials
    social_media = extract_social_media(row_data)
    
    # Crear document
    establishment_doc = {
        "name": name,
        "commercial_name": row_data.get('commercial_name', '').strip() or None,
        "description": row_data.get('description', '').strip() or None,
        "category": row_data.get('category', '').strip() or None,
        "subcategory": row_data.get('subcategory', '').strip() or None,
        "address": row_data.get('address', '').strip() or None,
        "postal_code": postal_code or None,
        "phone": phone or None,
        "email": email or None,
        "website": website or None,
        "nif": nif or None,
        "image_url": image_base64 or logo_url or None,  # Prioritzar base64, si no URL original
        "external_id": row_data.get('external_id', '').strip() or None,
        "partner_id": row_data.get('partner_id', '').strip() or None,
        "social_media": social_media,
        "google_maps_url": google_maps_url or None,
        "video_url": video_url or None,
        "video_url_2": clean_url(row_data.get('video_url_2', '')) or None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insertar o actualitzar
    if operation == 'insert':
        await db.establishments.insert_one(establishment_doc)
        print(f"✅ '{name}' afegit correctament")
    else:
        await db.establishments.update_one(
            {"name": name},
            {"$set": establishment_doc}
        )
        print(f"✅ '{name}' actualitzat correctament")


async def import_from_pdf_data():
    """
    Aquesta funció hauria de cridar un servei d'extracció de PDF
    Per ara, importem dades d'exemple
    """
    
    # Exemple de dades extretes del PDF
    # En producció, això vindria d'una extracció real del PDF
    establishments_data = [
        {
            "name": "RITUALS",
            "commercial_name": "Rituals",
            "address": "carrer Monterols, 34",
            "phone": "+34666426866",
            "external_id": "4115573250",
            "partner_id": "110741680",
            "category": "Salut / Bellesa",
            "subcategory": "perfumeria bellesa",
            "nif": "B64936610",
            "logo_url": "https://www.eltombdereus.com/uploads/2021/07/slider1-rituals1.jpg",
            "description": "<p>Rituals</p>",
            "email": "reus@rituals.com",
            "facebook_url": "https://www.facebook.com/RitualsCosmeticsES",
            "instagram_url": "https://www.instagram.com/ritualscosmeticsspain/",
            "twitter_url": "https://twitter.com/rituals",
            "youtube": "https://www.youtube.com/user/ritualscosmetics"
        },
        {
            "name": "ROVIRA JOIERS",
            "commercial_name": "Rovira Joiers",
            "address": "carrer Llovera, 28",
            "phone": "+34607142788",
            "external_id": "4115680410",
            "partner_id": "110631190",
            "category": "Llar / Regals",
            "subcategory": "joieria rellotgeria regals",
            "nif": "B43235647",
            "logo_url": "https://www.eltombdereus.com/uploads/2021/07/20200409041214-slider1-rovira-joiers1.png",
            "description": "<p>Oferim la millor selecció de productes exclusius en joieria i rellotgeria. Alianzas, anillos de compromiso, relojes para hombre y mujer, regalos, artículos de piel, etc.</p>",
            "email": "info@rovirafuste.com",
            "facebook_url": "https://www.facebook.com/RoviraJoiers/",
            "instagram_url": "https://www.instagram.com/rovira_joiers/"
        }
    ]
    
    print("🚀 Iniciant importació d'establiments...")
    print(f"Total d'establiments a importar: {len(establishments_data)}\n")
    
    for idx, est_data in enumerate(establishments_data, 1):
        print(f"\n[{idx}/{len(establishments_data)}] Processant '{est_data.get('name')}'...")
        await import_establishment(est_data)
    
    print("\n✅ Importació completada!")
    
    # Mostrar estadístiques
    total = await db.establishments.count_documents({})
    with_nif = await db.establishments.count_documents({"nif": {"$ne": None, "$exists": True}})
    with_logo = await db.establishments.count_documents({"image_url": {"$ne": None, "$exists": True}})
    
    print(f"\n📊 ESTADÍSTIQUES:")
    print(f"   Total establiments: {total}")
    print(f"   Amb NIF: {with_nif}")
    print(f"   Amb logo: {with_logo}")


if __name__ == "__main__":
    asyncio.run(import_from_pdf_data())
