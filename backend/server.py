from fastapi import FastAPI, APIRouter, HTTPException, Header, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel, Field
from bson import ObjectId
import paypalrestsdk
import random
from push_notifications import send_push_notification, send_notification_to_user
from web_push_service import get_vapid_public_key

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logger = logging.getLogger(__name__)

# Import admin routes
from admin_routes import admin_router, OfferCreate, OfferUpdate
from news_scheduler import start_news_scheduler

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    print("⚠️ WARNING: MONGO_URL not set, using default localhost")
    mongo_url = 'mongodb://localhost:27017'

db_name = os.environ.get('DB_NAME', 'tomb_reus_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Neuromobile API configuration
NEUROMOBILE_API_BASE = "https://api.neuromobile.com/v1"
NEUROMOBILE_TOKEN = os.getenv('NEUROMOBILE_TOKEN', '')

# PayPal configuration
paypalrestsdk.configure({
    "mode": os.getenv('PAYPAL_MODE', 'sandbox'),
    "client_id": os.getenv('PAYPAL_CLIENT_ID', ''),
    "client_secret": os.getenv('PAYPAL_SECRET', '')
})

# Text de la Política de Protecció de Dades
def get_privacy_policy_text():
    return """
POLÍTICA DE PROTECCIÓ DE DADES - EL TOMB DE REUS

Última actualització: Octubre 2025

1. RESPONSABLE DEL TRACTAMENT
El Tomb de Reus, amb domicili a Reus, Tarragona, és el responsable del tractament de les seves dades personals.

2. FINALITAT DEL TRACTAMENT
Les seves dades personals seran tractades amb les següents finalitats:
- Gestió del seu registre com a usuari de l'aplicació
- Prestació dels serveis oferts a través de l'aplicació
- Enviament de comunicacions comercials sobre ofertes, esdeveniments i promocions dels establiments associats
- Compartició amb els nostres Patrocinadors Associats per a finalitats comercials i promocionals
- Millora de l'experiència d'usuari i personalització de continguts

3. LEGITIMACIÓ
La base legal per al tractament de les seves dades és el consentiment que ens atorga en acceptar aquesta política.

4. DESTINATARIS DE LES DADES
Les seves dades podran ser comunicades a:
- Establiments i comerços associats a El Tomb de Reus
- Patrocinadors i col·laboradors comercials
- Proveïdors de serveis tecnològics necessaris per al funcionament de l'aplicació

5. CONSERVACIÓ DE LES DADES
Les seves dades es conservaran mentre mantingui actiu el seu compte d'usuari i, posteriorment, durant el termini legalment establert.

6. DRETS DE L'USUARI
Vostè té dret a:
- Accedir a les seves dades personals
- Rectificar dades inexactes o incompletes
- Sol·licitar la supressió de les seves dades
- Oposar-se al tractament de les seves dades
- Sol·licitar la limitació del tractament
- Portabilitat de les dades
- Retirar el consentiment en qualsevol moment

Per exercir aquests drets, pot contactar-nos a través de l'aplicació o enviant un correu electrònic a protecciodades@eltombdereus.com

7. CONSENTIMENT
En acceptar aquesta política, vostè consent expressament:
- El tractament de les seves dades personals per part d'El Tomb de Reus
- La compartició de les seves dades amb els Patrocinadors Associats
- La recepció de comunicacions comercials
"""

# Create the main app
app = FastAPI(title="El Tomb de Reus API")

# Health check endpoints (for Railway and general use)
@app.get("/health")
async def health_check_root():
    return {"status": "healthy", "service": "El Tomb de Reus API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "El Tomb de Reus API"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class UserBase(BaseModel):
    email: str
    name: str  # Nom complet
    phone: Optional[str] = ""  # Opcional
    birth_date: Optional[datetime] = None  # Data de naixement opcional
    gender: Optional[str] = ""  # Sexe opcional
    address: Optional[str] = ""  # Adreça opcional
    city: Optional[str] = ""  # Població opcional
    role: str = "user"  # user, admin, local_associat, entitat_colaboradora, membre_consell
    language: str = "ca"  # Idioma preferit: ca, es, en, fr, it, ru
    tags: Optional[List[str]] = []  # Marcadors d'interès de l'usuari

class UserCreate(UserBase):
    password: str
    data_consent: bool  # Consentiment obligatori

class User(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    data_consent: Optional[bool] = None
    data_consent_date: Optional[datetime] = None
    establishment_id: Optional[str] = None  # Per locals associats
    push_token: Optional[str] = None  # Token per notificacions push
    member_code: Optional[str] = None  # Codi únic de membre per QR (carnet)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class EstablishmentBase(BaseModel):
    name: str
    commercial_name: Optional[str] = None  # Nom comercial
    description: Optional[str] = None
    category: Optional[str] = None  # Sector (categoria estadistica)
    subcategory: Optional[str] = None  # Subsector
    address: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    nif: Optional[str] = None  # CIF/NIF (vat_number)
    image_url: Optional[str] = None  # URL del logo
    
    # Nous camps de l'Excel
    status: Optional[str] = None  # estatus: "A Soci", etc.
    whatsapp: Optional[str] = None
    vat_number: Optional[str] = None  # Mateix que NIF
    iban: Optional[str] = None
    collectiu: Optional[str] = None  # col·lectiu
    quota: Optional[str] = None
    logo_url: Optional[str] = None
    imatge1_url: Optional[str] = None
    imatge2_url: Optional[str] = None
    web_url: Optional[str] = None  # Mateix que website
    tourvirtual_url: Optional[str] = None  # tour virtual
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    altres_categories: Optional[str] = None  # altres categories
    lbac: Optional[str] = None  # LBAC
    tiquets: Optional[str] = None  # tiquets (OK/None)
    gimcana: Optional[str] = None  # gimcana (OK/None)
    tombs: Optional[str] = None  # TOMBS (OK/None)
    
    # IDs externs
    external_id: Optional[str] = None  # ID extern
    partner_id: Optional[str] = None  # ID Soci
    establishment_code: Optional[str] = None  # Codi únic per QR (ESTAB-YYYYMMDD-XXXXXX)
    
    # Tipus de relació amb El Tomb de Reus
    establishment_type: Optional[str] = None  # "local_associat", "local_no_soci", "local_tancat", "patrocinador", "altres"
    collaboration_type: Optional[str] = None  # Per "altres": descripció del tipus de col·laboració
    visible_in_public_list: Optional[bool] = True  # Si apareix a la llista pública d'establiments
    
    # Xarxes socials (com a objecte) - DEPRECATED, usar camps individuals
    social_media: Optional[dict] = None  # {"facebook": "url", "instagram": "url", "twitter": "url", etc.}
    
    # Enllaços addicionals
    google_maps_url: Optional[str] = None
    video_url: Optional[str] = None
    video_url_2: Optional[str] = None
    
    # Horaris
    opening_hours: Optional[str] = None
    
    # Propietari (local associat)
    owner_id: Optional[str] = None
    
    created_at: Optional[datetime] = None

class Establishment(EstablishmentBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class OfferBase(BaseModel):
    establishment_id: str
    title: str
    description: str
    discount: Optional[str] = None
    valid_from: datetime
    valid_until: datetime
    image_url: Optional[str] = None
    terms: Optional[str] = None
    web_link: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[List[str]] = []  # Marcadors per classificar ofertes

class Offer(OfferBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class EventBase(BaseModel):
    establishment_id: Optional[str] = None  # Null si és de l'admin
    title: str
    description: str
    discount: Optional[str] = None  # Pot ser preu d'entrada
    valid_from: datetime
    valid_until: datetime
    image_url: Optional[str] = None
    terms: Optional[str] = None
    web_link: Optional[str] = None
    phone: Optional[str] = None
    # Xarxes socials
    facebook_link: Optional[str] = None
    instagram_link: Optional[str] = None
    twitter_link: Optional[str] = None
    youtube_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    tiktok_link: Optional[str] = None
    # Locals participants (només per esdeveniments de l'admin)
    participating_establishments: Optional[List[str]] = []  # Array d'IDs d'establiments
    tags: Optional[List[str]] = []  # Marcadors per classificar esdeveniments

class Event(EventBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Promocions amb sistema d'aprovació
class PromotionBase(BaseModel):
    title: str
    description: str
    image_url: str  # Format 3x4 vertical
    establishment_id: Optional[str] = None  # Si és d'un establiment específic
    link_url: Optional[str] = None  # Enllaç clicable
    valid_from: datetime
    valid_until: datetime
    tag: Optional[str] = None  # Marcador per filtrar usuaris participants

class PromotionCreate(BaseModel):
    title: str
    description: str
    image_url: str
    establishment_id: Optional[str] = None
    link_url: Optional[str] = None
    valid_from: str  # Acceptem string ISO
    valid_until: str  # Acceptem string ISO
    tag: Optional[str] = None

class Promotion(PromotionBase):
    id: str = Field(alias="_id")
    created_by: str  # user_id del creador
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None  # user_id de l'admin que revisa
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Model de Marcador (Tag) per classificar usuaris
class TagBase(BaseModel):
    name: str  # Nom del marcador (igual que el títol de l'event/promoció/sorteig)
    source_type: str  # "event", "promotion", "raffle", "manual"
    source_id: Optional[str] = None  # ID de l'event/promoció/sorteig que l'ha creat
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Tag(TagBase):
    id: str = Field(alias="_id")
    user_count: int = 0  # Nombre d'usuaris amb aquest marcador
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class NewsArticle(BaseModel):
    title: str
    url: str
    source: str
    description: Optional[str] = ""
    image: Optional[str] = None  # Base64 o URL de la imatge
    publish_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    expiry_date: Optional[datetime] = None  # Data de caducitat
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_automatic: bool = True  # True si és automàtica, False si manual
    category: Optional[str] = "general"

class ClubContent(BaseModel):
    title: str
    url: Optional[str] = ""
    description: Optional[str] = ""
    image: Optional[str] = None  # Base64 o URL de la imatge
    publish_date: Optional[datetime] = Field(default_factory=datetime.utcnow)
    expiry_date: Optional[datetime] = None  # Data de caducitat
    created_at: datetime = Field(default_factory=datetime.utcnow)
    category: Optional[str] = "activitat"  # activitat, avantatge, premi, etc.

class InfoContent(BaseModel):
    title: str
    description: str
    image: Optional[str] = None  # Base64 o URL de la imatge (4x6)
    contact_email: Optional[str] = ""
    order: Optional[int] = 0  # Ordre de visualització
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Ticket(BaseModel):
    ticket_number: str  # Número únic del tiquet
    establishment_name: str  # Nom de l'establiment
    amount: float  # Import total
    ticket_date: Optional[datetime] = None  # Data del tiquet
    image: str  # Imatge del tiquet (base64)
    user_id: str  # Usuari que puja el tiquet
    participations_generated: int  # Participacions generades (amount // 10)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    validated: bool = False  # Si ha estat validat per admin
    
class DrawParticipation(BaseModel):
    user_id: str
    participations: int  # Número de participacions acumulades
    tickets_count: int  # Número de tiquets escanejats
    last_ticket_date: Optional[datetime] = None
    
class Draw(BaseModel):
    draw_date: datetime
    winner_id: Optional[str] = None
    winner_name: Optional[str] = None
    prize_description: str
    total_participants: int
    total_participations: int
    status: str = "pending"  # pending, completed

class TicketCampaign(BaseModel):
    title: str = "Escaneja Tiquets i Guanya Premis"
    description: Optional[str] = ""
    image: Optional[str] = None  # Imatge de la campanya
    start_date: datetime
    end_date: datetime
    prize_description: str
    is_active: bool = True
    tag: Optional[str] = None  # Marcador per filtrar usuaris participants
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GiftCardBase(BaseModel):
    amount: float
    code: str
    user_id: str
    balance: float
    status: str = "active"  # active, used, expired

class GiftCardCreate(BaseModel):
    amount: float
    user_id: str

class GiftCard(GiftCardBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class TicketScanBase(BaseModel):
    user_id: str
    ticket_code: str
    establishment_id: Optional[str] = None
    amount: Optional[float] = None

class TicketScan(TicketScanBase):
    id: str = Field(alias="_id")
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class PaymentOrderCreate(BaseModel):
    amount: float
    currency: str = "EUR"
    return_url: str
    cancel_url: str

class ConsentHistoryBase(BaseModel):
    user_id: str
    consent_type: str  # "data_protection"
    consent_given: bool
    consent_text: str
    ip_address: Optional[str] = None

class ConsentHistory(ConsentHistoryBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class PushTokenUpdate(BaseModel):
    push_token: str

class WebPushSubscription(BaseModel):
    """Model per a la subscripció Web Push"""
    endpoint: str
    keys: dict  # p256dh i auth

# Helper function for authentication
async def get_user_from_token(authorization: str):
    """Obtenir usuari des del token d'autorització"""
    if not authorization:
        print("[AUTH] No hi ha authorization header")
        return None
    
    # Suportar diferents formats de token
    token = authorization.replace("Bearer ", "").replace("token_", "")
    print(f"[AUTH] Token rebut (primers 20 chars): {token[:20]}...")
    
    try:
        # Primer intentar buscar per token directament (nou sistema)
        user = await db.users.find_one({"token": token})
        if user:
            print(f"[AUTH] Usuari trobat pel camp 'token': {user.get('email')}")
            return user
        else:
            print("[AUTH] Usuari NO trobat pel camp 'token'")
        
        # Si no es troba, intentar buscar per _id (sistema antic amb token_)
        try:
            user = await db.users.find_one({"_id": ObjectId(token)})
            if user:
                print(f"[AUTH] Usuari trobat per ObjectId: {user.get('email')}")
            return user
        except Exception as e:
            print(f"[AUTH] Error buscant per ObjectId: {e}")
            return None
    except Exception as e:
        print(f"[AUTH] Error general: {e}")
        return None

# Authentication endpoints
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validar que ha acceptat el consentiment
    if not user_data.data_consent:
        raise HTTPException(status_code=400, detail="Has d'acceptar la política de protecció de dades")
    
    # Imports necessaris
    import secrets
    from datetime import datetime
    from passlib.context import CryptContext
    
    # Hash password amb bcrypt
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user_dict = user_data.dict()
    user_dict['password'] = pwd_context.hash(user_data.password)
    user_dict['data_consent_date'] = datetime.utcnow()
    user_dict['created_at'] = datetime.utcnow()
    
    # Generar token automàticament per al nou usuari
    user_dict['token'] = secrets.token_urlsafe(32)
    
    # Generar codi únic de membre (QR ID) - Format: REUS-YYYYMMDD-XXXXX
    date_str = datetime.utcnow().strftime('%Y%m%d')
    random_code = secrets.token_hex(3).upper()  # 6 caràcters hexadecimals
    user_dict['member_code'] = f"REUS-{date_str}-{random_code}"
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Guardar historial de consentiment
    consent_history = {
        "user_id": user_id,
        "consent_type": "data_protection",
        "consent_given": True,
        "consent_text": get_privacy_policy_text(),
        "created_at": datetime.utcnow()
    }
    await db.consent_history.insert_one(consent_history)
    
    user_dict['_id'] = user_id
    
    return User(**user_dict)

@api_router.put("/users/push-token")
async def update_push_token(
    token_data: PushTokenUpdate,
    authorization: str = Header(None)
):
    """Actualitzar el token push d'un usuari"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Actualitzar el push token
    await db.users.update_one(
        {"_id": user['_id']},
        {"$set": {"push_token": token_data.push_token}}
    )
    
    logger.info(f"Push token actualitzat per usuari {user.get('email')}: {token_data.push_token[:30]}...")
    
    return {"success": True, "message": "Push token actualitzat correctament"}


# ============================================================================
# WEB PUSH NOTIFICATIONS
# ============================================================================

@api_router.get("/web-push/vapid-public-key")
async def get_web_push_vapid_key():
    """Obtenir la clau pública VAPID per al frontend"""
    vapid_key = get_vapid_public_key()
    if not vapid_key:
        raise HTTPException(
            status_code=503, 
            detail="Web Push no configurat. Falten les claus VAPID."
        )
    return {"vapidPublicKey": vapid_key}


@api_router.post("/web-push/subscribe")
async def subscribe_web_push(
    subscription: WebPushSubscription,
    authorization: str = Header(None)
):
    """Guardar la subscripció Web Push d'un usuari"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    # Crear objecte de subscripció complet
    subscription_obj = {
        "endpoint": subscription.endpoint,
        "keys": subscription.keys
    }
    
    # Actualitzar l'usuari amb la subscripció Web Push
    await db.users.update_one(
        {"_id": user['_id']},
        {"$set": {"web_push_subscription": subscription_obj}}
    )
    
    logger.info(f"✅ Web Push subscrit per usuari {user.get('email')}")
    
    return {"success": True, "message": "Subscripció Web Push guardada correctament"}


@api_router.delete("/web-push/unsubscribe")
async def unsubscribe_web_push(
    authorization: str = Header(None)
):
    """Eliminar la subscripció Web Push d'un usuari"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    # Eliminar la subscripció
    await db.users.update_one(
        {"_id": user['_id']},
        {"$unset": {"web_push_subscription": ""}}
    )
    
    logger.info(f"❌ Web Push dessubscrit per usuari {user.get('email')}")
    
    return {"success": True, "message": "Subscripció Web Push eliminada"}


@api_router.put("/users/language")
async def update_user_language(
    request: Request,
    authorization: str = Header(None)
):
    """Actualitzar l'idioma preferit de l'usuari"""
    # Utilitzar get_user_from_token per autenticació consistent
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    # Obtenir dades del body
    try:
        data = await request.json()
        language = data.get('language')
    except:
        raise HTTPException(status_code=400, detail="Body JSON invàlid")
    
    if not language:
        raise HTTPException(status_code=400, detail="Camp 'language' requerit")
    
    # Validar idioma
    valid_languages = ['ca', 'es', 'en', 'fr', 'it', 'ru']
    if language not in valid_languages:
        raise HTTPException(status_code=400, detail=f"Idioma no vàlid. Opcions: {', '.join(valid_languages)}")
    
    # Actualitzar idioma
    await db.users.update_one(
        {"_id": user['_id']},
        {"$set": {"language": language}}
    )
    
    return {"success": True, "language": language}

@api_router.post("/auth/login")
async def login(email: str, password: str):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    logger.info(f"Login attempt for email: {email}")
    user = await db.users.find_one({"email": email})
    if not user:
        logger.warning(f"User not found: {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logger.info(f"User found: {email}, verifying password...")
    # Verificar contrasenya amb bcrypt
    try:
        is_valid = pwd_context.verify(password, user.get('password'))
        logger.info(f"Password verification result: {is_valid}")
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Utilitzar el token existent o generar-ne un de nou si no en té
    import secrets
    token = user.get('token')
    
    if not token:
        # Només generar token nou si l'usuari no en té cap
        token = secrets.token_urlsafe(32)
        await db.users.update_one(
            {"_id": user['_id']},
            {"$set": {"token": token}}
        )
    
    user['_id'] = str(user['_id'])
    user['token'] = token
    return {"user": user, "token": token}

# Neuromobile Integration endpoints
@api_router.get("/my-establishment")
async def get_my_establishment(authorization: str = Header(None)):
    """Obtenir l'establiment del local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Only local associates can access this")
    
    # Buscar establiment del local associat
    establishment = await db.establishments.find_one({"owner_id": user['_id']})
    
    if establishment:
        establishment['_id'] = str(establishment['_id'])
        establishment['id'] = str(establishment.get('_id'))
        # Convertir owner_id a string si existeix
        if establishment.get('owner_id'):
            establishment['owner_id'] = str(establishment['owner_id'])
        return establishment
    
    return None

@api_router.post("/my-establishment")
async def create_my_establishment(
    establishment: EstablishmentBase,
    authorization: str = Header(None)
):
    """Crear establiment pel local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Only local associates can create establishments")
    
    # Verificar si ja té un establiment
    existing = await db.establishments.find_one({"owner_id": user['_id']})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an establishment")
    
    # Crear establiment
    establishment_dict = establishment.dict()
    establishment_dict['owner_id'] = user['_id']
    establishment_dict['created_at'] = datetime.utcnow()
    
    # Generar codi únic d'establiment si no existeix
    if not establishment_dict.get('establishment_code'):
        import secrets
        date_str = datetime.utcnow().strftime('%Y%m%d')
        random_code = secrets.token_hex(3).upper()
        establishment_dict['establishment_code'] = f"ESTAB-{date_str}-{random_code}"
    
    result = await db.establishments.insert_one(establishment_dict)
    
    # Actualitzar user amb establishment_id
    await db.users.update_one(
        {"_id": ObjectId(user['_id'])},
        {"$set": {"establishment_id": str(result.inserted_id)}}
    )
    
    return {"id": str(result.inserted_id), "message": "Establishment created successfully"}

@api_router.put("/my-establishment")
async def update_my_establishment(
    establishment: EstablishmentBase,
    authorization: str = Header(None)
):
    """Actualitzar establiment del local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Only local associates can update establishments")
    
    # Buscar establiment
    existing = await db.establishments.find_one({"owner_id": user['_id']})
    if not existing:
        raise HTTPException(status_code=404, detail="No establishment found")
    
    # Actualitzar
    update_data = {k: v for k, v in establishment.dict().items() if v is not None}
    
    await db.establishments.update_one(
        {"_id": existing['_id']},
        {"$set": update_data}
    )
    
    return {"message": "Establishment updated successfully"}

@api_router.get("/establishments")
async def get_establishments():
    try:
        # NEUROMOBILE DESACTIVAT - Utilitzant només dades locals de MongoDB
        if True:  # not NEUROMOBILE_TOKEN:
            logger.info("Neuromobile temporalment desactivat, using local data only")
            raise ValueError("Using local MongoDB data - Neuromobile disabled")
        
        # Try to fetch from Neuromobile API
        # Configurar client amb millor gestió SSL
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        async with httpx.AsyncClient(verify=ssl_context) as client:
            headers = {
                "Authorization": f"Bearer {NEUROMOBILE_TOKEN}",
                "Content-Type": "application/json"
            }
            response = await client.get(
                f"{NEUROMOBILE_API_BASE}/commerces",
                headers=headers,
                timeout=15.0
            )
            
            if response.status_code == 200:
                commerces = response.json()
                logger.info(f"Fetched {len(commerces)} commerces from Neuromobile")
                
                # Store in MongoDB for caching
                for commerce in commerces:
                    # Assegurar que els camps existeixen
                    commerce_data = {
                        "_id": commerce.get("id", str(ObjectId())),
                        "name": commerce.get("name", ""),
                        "address": commerce.get("address"),
                        "latitude": commerce.get("latitude"),
                        "longitude": commerce.get("longitude"),
                        "phone": commerce.get("phone"),
                        "email": commerce.get("email"),
                        "category": commerce.get("category"),
                        "description": commerce.get("description"),
                        "image_url": commerce.get("image_url"),
                        "updated_at": datetime.utcnow()
                    }
                    
                    await db.establishments.update_one(
                        {"_id": commerce_data["_id"]},
                        {"$set": commerce_data},
                        upsert=True
                    )
                
                # Afegir establiments locals que no estan a Neuromobile
                neuromobile_ids = [c.get("id") for c in commerces]
                local_establishments = await db.establishments.find({
                    "$and": [
                        {"_id": {"$nin": neuromobile_ids}},
                        {"status": "A Soci"},
                        {
                            "$or": [
                                {"visible_in_public_list": True},
                                {"visible_in_public_list": {"$exists": False}}
                            ]
                        }
                    ]
                }).to_list(1000)
                
                # Convertir ObjectId a string per als locals
                for est in local_establishments:
                    est['_id'] = str(est['_id'])
                    est['id'] = est['_id']
                    if est.get('owner_id'):
                        est['owner_id'] = str(est['owner_id'])
                    commerces.append(est)
                
                logger.info(f"Added {len(local_establishments)} local establishments")
                return commerces
            else:
                logger.error(f"Failed to fetch from Neuromobile: {response.status_code}")
    
    except Exception as e:
        logger.error(f"Error fetching from Neuromobile: {str(e)}")
    
    # Fallback to MongoDB - només establiments visibles públicament i socis actius
    establishments = await db.establishments.find({
        "$and": [
            # Només socis actius
            {"status": "A Soci"},
            # I visibles públicament
            {
                "$or": [
                    {"visible_in_public_list": True},
                    {"visible_in_public_list": {"$exists": False}}  # Per compatibilitat amb establiments antics
                ]
            }
        ]
    }).to_list(1000)
    
    logger.info(f"Returning {len(establishments)} establishments from MongoDB fallback")
    
    for est in establishments:
        est['_id'] = str(est['_id'])
        est['id'] = est['_id']
        # Convertir owner_id a string si existeix
        if est.get('owner_id'):
            est['owner_id'] = str(est['owner_id'])
    return establishments

@api_router.get("/establishments/{establishment_id}")
async def get_establishment(establishment_id: str):
    est = await db.establishments.find_one({"_id": ObjectId(establishment_id)})
    if not est:
        raise HTTPException(status_code=404, detail="Establishment not found")
    est['_id'] = str(est['_id'])
    # Convertir owner_id a string si existeix
    if est.get('owner_id'):
        est['owner_id'] = str(est['owner_id'])
    return est

@api_router.put("/admin/establishments/{establishment_id}")
async def update_establishment(
    establishment_id: str,
    establishment: EstablishmentBase,
    authorization: str = Header(None)
):
    """Actualitzar establiment (només admin)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update establishments")
    
    # Verificar que l'establiment existeix
    existing = await db.establishments.find_one({"_id": ObjectId(establishment_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Establishment not found")
    
    # Actualitzar establiment
    establishment_dict = establishment.dict(exclude_unset=True)
    establishment_dict['updated_at'] = datetime.utcnow()
    
    await db.establishments.update_one(
        {"_id": ObjectId(establishment_id)},
        {"$set": establishment_dict}
    )
    
    return {"success": True, "message": "Establishment updated successfully"}

# Offers endpoints
@api_router.get("/offers")
async def get_offers():
    """Obtenir ofertes actives (no caducades) per al directori públic"""
    from datetime import datetime
    
    # Filtrar només ofertes no caducades (valid_until > ara)
    current_time = datetime.now()
    offers = await db.offers.find({
        "valid_until": {"$gte": current_time}
    }).sort("created_at", -1).to_list(100)
    
    for offer in offers:
        offer['_id'] = str(offer['_id'])
        offer['id'] = str(offer['_id'])
    return offers

@api_router.get("/offers/{offer_id}")
async def get_offer(offer_id: str):
    offer = await db.offers.find_one({"_id": ObjectId(offer_id)})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer['_id'] = str(offer['_id'])
    offer['id'] = str(offer['_id'])
    return offer


# ============================================================================
# LOCAL ASSOCIAT - Gestió d'Ofertes
# ============================================================================

@api_router.put("/establishments/{establishment_id}/gallery")
async def update_establishment_gallery(
    establishment_id: str,
    gallery_data: dict,
    authorization: str = Header(None)
):
    """Actualitzar la galeria d'imatges d'un establiment"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    # Verificar que l'usuari és propietari de l'establiment o admin
    establishment = await db.establishments.find_one({"_id": ObjectId(establishment_id)})
    if not establishment:
        raise HTTPException(status_code=404, detail="Establiment no trobat")
    
    user_id = str(user['_id'])
    is_owner = str(establishment.get('owner_id')) == user_id
    is_admin = user.get('role') == 'admin'
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="No tens permís per modificar aquest establiment")
    
    # Actualitzar la galeria
    gallery = gallery_data.get('gallery', [])
    
    # Validar que no hi ha més de 3 imatges
    if len(gallery) > 3:
        raise HTTPException(status_code=400, detail="Màxim 3 imatges permeses")
    
    # Actualitzar a la base de dades
    result = await db.establishments.update_one(
        {"_id": ObjectId(establishment_id)},
        {"$set": {"gallery": gallery, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No s'ha pogut actualitzar l'establiment")
    
    return {"success": True, "message": "Galeria actualitzada correctament"}


@api_router.get("/local-associat/my-offers")
async def get_my_offers(authorization: str = Header(None)):
    """Obtenir les ofertes del local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionat")
    
    token = authorization.replace('Bearer ', '')
    user = await db.users.find_one({"token": token})
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Accés denegat")
    
    # Obtenir l'establiment del local associat
    establishment = await db.establishments.find_one({"owner_id": user['_id']})
    
    if not establishment:
        return []
    
    # Obtenir ofertes d'aquest establiment
    offers = await db.offers.find({"establishment_id": str(establishment['_id'])}).to_list(100)
    for offer in offers:
        offer['_id'] = str(offer['_id'])
    
    return offers

@api_router.post("/local-associat/offers")
async def create_my_offer(
    offer: OfferCreate,
    authorization: str = Header(None)
):
    """Crear una oferta com a local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionat")
    
    token = authorization.replace('Bearer ', '')
    user = await db.users.find_one({"token": token})
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Accés denegat")
    
    # Obtenir l'establiment del local associat
    establishment = await db.establishments.find_one({"owner_id": user['_id']})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens un establiment assignat")
    
    # Forçar que l'oferta sigui per l'establiment del local
    offer_dict = offer.dict()
    offer_dict['establishment_id'] = str(establishment['_id'])
    offer_dict['created_at'] = datetime.utcnow()
    offer_dict['updated_at'] = datetime.utcnow()
    offer_dict['created_by'] = str(user['_id'])
    
    result = await db.offers.insert_one(offer_dict)
    offer_dict['_id'] = str(result.inserted_id)
    
    return offer_dict

@api_router.put("/local-associat/offers/{offer_id}")
async def update_my_offer(
    offer_id: str,
    offer: OfferUpdate,
    authorization: str = Header(None)
):
    """Actualitzar una oferta com a local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionat")
    
    token = authorization.replace('Bearer ', '')
    user = await db.users.find_one({"token": token})
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Accés denegat")
    
    # Obtenir l'establiment del local associat
    establishment = await db.establishments.find_one({"owner_id": user['_id']})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens un establiment assignat")
    
    # Verificar que l'oferta pertany a l'establiment del local
    existing_offer = await db.offers.find_one({"_id": ObjectId(offer_id)})
    
    if not existing_offer:
        raise HTTPException(status_code=404, detail="Oferta no trobada")
    
    if existing_offer.get('establishment_id') != str(establishment['_id']) and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="No pots editar ofertes d'altres establiments")
    
    update_data = {k: v for k, v in offer.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    result = await db.offers.update_one(
        {"_id": ObjectId(offer_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Oferta no trobada")
    
    updated = await db.offers.find_one({"_id": ObjectId(offer_id)})
    updated['_id'] = str(updated['_id'])
    
    return updated

@api_router.delete("/local-associat/offers/{offer_id}")
async def delete_my_offer(
    offer_id: str,
    authorization: str = Header(None)
):
    """Eliminar una oferta com a local associat"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionat")
    
    token = authorization.replace('Bearer ', '')
    user = await db.users.find_one({"token": token})
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    
    if user.get('role') not in ['local_associat', 'admin']:
        raise HTTPException(status_code=403, detail="Accés denegat")
    
    # Obtenir l'establiment del local associat
    establishment = await db.establishments.find_one({"owner_id": user['_id']})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens un establiment assignat")
    
    # Verificar que l'oferta pertany a l'establiment del local
    existing_offer = await db.offers.find_one({"_id": ObjectId(offer_id)})
    
    if not existing_offer:
        raise HTTPException(status_code=404, detail="Oferta no trobada")
    
    if existing_offer.get('establishment_id') != str(establishment['_id']) and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="No pots eliminar ofertes d'altres establiments")
    
    result = await db.offers.delete_one({"_id": ObjectId(offer_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oferta no trobada")
    
    return {"success": True, "message": "Oferta eliminada"}


# Events endpoints
@api_router.get("/events")
async def get_events():
    """Obtenir esdeveniments públics (només amb l'estructura nova)"""
    current_time = datetime.utcnow()
    events = await db.events.find({
        "valid_from": {"$exists": True},
        "valid_until": {"$exists": True, "$gte": current_time}
    }).sort("valid_from", 1).to_list(100)
    
    for event in events:
        event['_id'] = str(event['_id'])
        event['id'] = str(event['_id'])
        if event.get('establishment_id'):
            event['establishment_id'] = str(event['establishment_id'])
    
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    """Obtenir un esdeveniment per ID"""
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event['_id'] = str(event['_id'])
    event['id'] = str(event['_id'])
    if event.get('establishment_id'):
        event['establishment_id'] = str(event['establishment_id'])
    
    return event

# Promotions endpoints
@api_router.get("/promotions")
async def get_promotions(authorization: str = Header(None)):
    """
    Obtenir promocions:
    - Si és admin o local_associat: veu totes les seves
    - Si és usuari normal: només veu les aprovades
    """
    if authorization:
        user = await get_user_from_token(authorization)
        
        if user and user.get('role') in ['admin', 'local_associat', 'entitat_colaboradora', 'membre_consell']:
            user_id = str(user['_id'])
            # Admins i associats veuen totes les seves
            if user.get('role') == 'admin':
                promotions = await db.promotions.find().sort("created_at", -1).to_list(100)
            else:
                promotions = await db.promotions.find({"created_by": user_id}).sort("created_at", -1).to_list(100)
        else:
            # Usuaris normals només veuen aprovades
            promotions = await db.promotions.find({"status": "approved"}).sort("created_at", -1).to_list(100)
    else:
        # Sense autenticació: només aprovades
        promotions = await db.promotions.find({"status": "approved"}).sort("created_at", -1).to_list(100)
    
    for promo in promotions:
        promo['_id'] = str(promo['_id'])
        promo['id'] = str(promo['_id'])
    
    return promotions

@api_router.get("/promotions/{promotion_id}")
async def get_promotion(promotion_id: str):
    """Obtenir una promoció específica"""
    try:
        promotion = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
        if not promotion:
            raise HTTPException(status_code=404, detail="Promotion not found")
        
        promotion['_id'] = str(promotion['_id'])
        promotion['id'] = str(promotion['_id'])
        return promotion
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# NOTÍCIES "REUS I EL TERRITORI"
# ============================================================================

@api_router.get("/news")
async def get_news(limit: int = 20):
    """Obtenir notícies de Reus i el Territori (només notícies vàlides i no expirades)"""
    try:
        now = datetime.utcnow()
        # Filtrar notícies que no han expirat o que no tenen data de caducitat
        news = await db.news.find({
            "$or": [
                {"expiry_date": None},
                {"expiry_date": {"$gte": now}}
            ]
        }).sort("created_at", -1).limit(limit).to_list(limit)
        
        for item in news:
            item['_id'] = str(item['_id'])
            item['id'] = str(item['_id'])
        return news
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/news")
async def create_news(news_data: NewsArticle, authorization: str = Header(None)):
    """Crear notícia manualment (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        news_dict = news_data.dict()
        news_dict['is_automatic'] = False  # Marcar com manual
        result = await db.news.insert_one(news_dict)
        news_dict['_id'] = str(result.inserted_id)
        news_dict['id'] = str(result.inserted_id)
        return news_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/news/{news_id}")
async def update_news(news_id: str, news_data: NewsArticle, authorization: str = Header(None)):
    """Actualitzar notícia (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        news_dict = news_data.dict(exclude_unset=True)
        result = await db.news.update_one(
            {"_id": ObjectId(news_id)},
            {"$set": news_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="News not found")
        
        updated_news = await db.news.find_one({"_id": ObjectId(news_id)})
        updated_news['_id'] = str(updated_news['_id'])
        updated_news['id'] = str(updated_news['_id'])
        return updated_news
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, authorization: str = Header(None)):
    """Eliminar notícia (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = await db.news.delete_one({"_id": ObjectId(news_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="News not found")
        return {"message": "News deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/news/fetch-automatic")
async def fetch_automatic_news(authorization: str = Header(None)):
    """Executar scraping automàtic de notícies (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        from news_scraper import fetch_daily_news
        
        # Obtenir notícies
        news_items = await fetch_daily_news(max_news=6)
        
        # Guardar a la base de dades
        inserted_count = 0
        for item in news_items:
            # Evitar duplicats
            existing = await db.news.find_one({"url": item['url']})
            if not existing:
                await db.news.insert_one({
                    "title": item['title'],
                    "url": item['url'],
                    "source": item['source'],
                    "created_at": datetime.utcnow(),
                    "publish_date": datetime.utcnow(),
                    "is_automatic": True,
                    "category": "general"
                })
                inserted_count += 1
        
        return {
            "success": True,
            "fetched": len(news_items),
            "inserted": inserted_count,
            "skipped": len(news_items) - inserted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CLUB EL TOMB - CONTINGUTS
# ============================================================================

@api_router.get("/club/content")
async def get_club_content(limit: int = 50):
    """Obtenir continguts del Club El Tomb (inclou esdeveniments actius)"""
    try:
        # 1. Filtrar continguts del club no caducats
        club_content = await db.club_content.find({
            "$or": [
                {"expiry_date": None},
                {"expiry_date": {"$gte": datetime.utcnow()}}
            ]
        }).sort("publish_date", -1).to_list(limit)
        
        for item in club_content:
            item['_id'] = str(item['_id'])
            item['id'] = str(item['_id'])
        
        # 2. Obtenir esdeveniments actius (no caducats)
        now = datetime.utcnow()
        events = await db.events.find({
            "valid_until": {"$gte": now}
        }).sort("valid_from", -1).to_list(20)
        
        # 3. Convertir esdeveniments a format de contingut del club
        for event in events:
            event['_id'] = str(event['_id'])
            event['id'] = str(event['_id'])
            # Afegir categoria per identificar-los com a esdeveniments
            if 'category' not in event:
                event['category'] = 'Esdeveniments'
            # Mapear camps d'event a format de club_content
            if 'publish_date' not in event:
                event['publish_date'] = event.get('valid_from', datetime.utcnow())
            if 'expiry_date' not in event:
                event['expiry_date'] = event.get('valid_until')
        
        # 4. Combinar contingut del club i esdeveniments
        all_content = club_content + events
        
        # 5. Ordenar per data de publicació
        all_content.sort(key=lambda x: x.get('publish_date', datetime.min), reverse=True)
        
        return all_content[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/club/content")
async def create_club_content(content_data: ClubContent, authorization: str = Header(None)):
    """Crear contingut del Club (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        content_dict = content_data.dict()
        result = await db.club_content.insert_one(content_dict)
        content_dict['_id'] = str(result.inserted_id)
        content_dict['id'] = str(result.inserted_id)
        return content_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/club/content/{content_id}")
async def update_club_content(content_id: str, content_data: ClubContent, authorization: str = Header(None)):
    """Actualitzar contingut del Club (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        content_dict = content_data.dict(exclude_unset=True)
        result = await db.club_content.update_one(
            {"_id": ObjectId(content_id)},
            {"$set": content_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        
        updated_content = await db.club_content.find_one({"_id": ObjectId(content_id)})
        updated_content['_id'] = str(updated_content['_id'])
        updated_content['id'] = str(updated_content['_id'])
        return updated_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/club/content/{content_id}")
async def delete_club_content(content_id: str, authorization: str = Header(None)):
    """Eliminar contingut del Club (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = await db.club_content.delete_one({"_id": ObjectId(content_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        return {"message": "Content deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# INFORMACIÓ - Continguts sobre El Tomb de Reus
# ============================================================================

@api_router.get("/info/content")
async def get_info_content():
    """Obtenir continguts d'informació (públic)"""
    try:
        content = await db.info_content.find({"is_active": True}).sort("order", 1).to_list(50)
        for item in content:
            item['_id'] = str(item['_id'])
            item['id'] = str(item['_id'])
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/info/content")
async def create_info_content(content_data: InfoContent, authorization: str = Header(None)):
    """Crear contingut d'informació (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        content_dict = content_data.dict()
        result = await db.info_content.insert_one(content_dict)
        content_dict['_id'] = str(result.inserted_id)
        content_dict['id'] = str(result.inserted_id)
        return content_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/info/content/{content_id}")
async def update_info_content(content_id: str, content_data: InfoContent, authorization: str = Header(None)):
    """Actualitzar contingut d'informació (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        content_dict = content_data.dict(exclude_unset=True)
        result = await db.info_content.update_one(
            {"_id": ObjectId(content_id)},
            {"$set": content_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        
        updated_content = await db.info_content.find_one({"_id": ObjectId(content_id)})
        updated_content['_id'] = str(updated_content['_id'])
        updated_content['id'] = str(updated_content['_id'])
        return updated_content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/info/content/{content_id}")
async def delete_info_content(content_id: str, authorization: str = Header(None)):
    """Eliminar contingut d'informació (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = await db.info_content.delete_one({"_id": ObjectId(content_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        return {"message": "Content deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# SISTEMA DE TIQUETS I SORTEJOS
# ============================================================================

class TicketProcessRequest(BaseModel):
    ticket_image: str

@api_router.post("/tickets/process")
async def process_ticket(request: TicketProcessRequest, authorization: str = Header(None)):
    """Processar tiquet amb OCR i generar participacions"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        # from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        from openai import OpenAI
        import os
        from participation_tracker import track_participation
        
        # Processar imatge amb OCR utilitzant IA
        api_key = os.getenv('EMERGENT_LLM_KEY')
        
        prompt = """Ets un expert en processar tiquets de compra. Analitza aquesta imatge de tiquet i extreu:

1. Número de tiquet (busca: "Nº", "Ticket", "Factura", o número llarg)
2. Nom de l'establiment (a la part superior)
3. NIF o CIF de l'establiment (busca: "NIF:", "CIF:", "B-", "A-" seguit de números)
4. Import total (busca: "TOTAL", "Total", "IMPORTE", "EUR")
5. Data (format DD/MM/YYYY o similar)

IMPORTANT: Retorna NOMÉS un JSON vàlid amb aquest format exacte:
{
  "ticket_number": "número del tiquet",
  "establishment": "nom de l'establiment",
  "nif": "NIF/CIF de l'establiment",
  "amount": importe_numèric,
  "date": "DD/MM/YYYY"
}

Si no pots extreure alguna dada, posa null."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"ticket_{user['_id']}_{datetime.now().timestamp()}",
            system_message="Ets un expert OCR que extreu dades de tiquets amb precisió."
        ).with_model("openai", "gpt-4o-mini")
        
        # Preparar imatge (eliminar prefix si és necessari)
        image_data = request.ticket_image
        if image_data.startswith('data:image'):
            # Extreure només la part base64
            image_data = image_data.split(',')[1]
        
        # Crear contingut d'imatge
        image_content = ImageContent(image_base64=image_data)
        
        # Enviar imatge i prompt
        user_message = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parsejar resposta JSON
        import json
        import re
        
        # Extreure JSON de la resposta (per si hi ha text extra)
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if not json_match:
            raise HTTPException(status_code=400, detail="No s'ha pogut processar el tiquet. Assegura't que la imatge és clara i llegible.")
        
        ticket_data = json.loads(json_match.group())
        
        # DEBUG: Log del que s'ha detectat
        print(f"🔍 OCR DETECTAT: {json.dumps(ticket_data, indent=2, ensure_ascii=False)}")
        
        # Validar dades bàsiques
        if not ticket_data.get("ticket_number") or not ticket_data.get("amount"):
            raise HTTPException(status_code=400, detail="No s'ha pogut llegir el número de tiquet o l'import. Fes una foto més clara.")
        
        # Comprovar duplicats (mateix número de tiquet)
        existing = await db.tickets.find_one({"ticket_number": ticket_data["ticket_number"]})
        if existing:
            raise HTTPException(status_code=400, detail="Aquest tiquet ja ha estat escanejat anteriorment.")
        
        # Comprovar si l'establiment està associat - PRIORITAT: NIF
        establishment_name = ticket_data.get("establishment", "")
        establishment_nif = ticket_data.get("nif", "")
        
        print(f"🔍 BUSCANT ESTABLIMENT:")
        print(f"   Nom detectat: '{establishment_name}'")
        print(f"   NIF detectat: '{establishment_nif}'")
        
        establishment = None
        
        # PRIORITAT 1: Buscar per NIF (més fiable que el nom comercial)
        if establishment_nif:
            print(f"   🔑 Cercant per NIF: '{establishment_nif}'")
            establishment = await db.establishments.find_one({"nif": establishment_nif})
            if establishment:
                print(f"   ✅ Trobat per NIF! Nom a BD: '{establishment['name']}'")
        
        # PRIORITAT 2: Si no té NIF o no el troba, buscar per nom
        if not establishment and establishment_name:
            print(f"   📝 Cercant per nom: '{establishment_name}'")
            query = {"name": {"$regex": establishment_name, "$options": "i"}}
            establishment = await db.establishments.find_one(query)
            if establishment:
                print(f"   ✅ Trobat per nom! ID: {establishment['_id']}")
        
        if not establishment:
            print(f"   ❌ NO TROBAT a la base de dades")
            raise HTTPException(
                status_code=400, 
                detail=f"L'establiment '{establishment_name}' (NIF: {establishment_nif or 'no detectat'}) no està al directori de El Tomb. Només els establiments socis poden generar participacions."
            )
        
        # Calcular participacions (1 per cada 10€)
        amount = float(ticket_data["amount"])
        participations = int(amount // 10)
        
        if participations == 0:
            raise HTTPException(status_code=400, detail="L'import mínim per generar participacions és 10€. Aquest tiquet té un import inferior.")
        
        # Guardar tiquet
        ticket_date = None
        if ticket_data.get("date"):
            try:
                ticket_date = datetime.strptime(ticket_data["date"], "%d/%m/%Y")
            except (ValueError, TypeError):
                ticket_date = datetime.utcnow()
        else:
            ticket_date = datetime.utcnow()
        
        ticket_doc = {
            "ticket_number": ticket_data["ticket_number"],
            "establishment_name": establishment_name,
            "establishment_id": str(establishment["_id"]),
            "amount": amount,
            "ticket_date": ticket_date,
            "image": request.ticket_image,
            "user_id": str(user["_id"]),
            "participations_generated": participations,
            "validated": True,  # Auto-validat si l'establiment està a la BD
            "created_at": datetime.utcnow()
        }
        
        await db.tickets.insert_one(ticket_doc)
        
        # Tracking de participació per marcador (si la campanya té tag)
        active_campaign = await db.ticket_campaigns.find_one({"is_active": True})
        if active_campaign and active_campaign.get("tag"):
            await track_participation(
                user_id=str(user["_id"]),
                tag=active_campaign["tag"],
                activity_type="ticket_scan",
                activity_id=str(active_campaign.get("_id", "")),
                activity_title=active_campaign.get("title", "Escaneja Tiquets"),
                metadata={
                    "establishment_name": establishment_name,
                    "amount": amount,
                    "participations": participations
                }
            )
        
        # Actualitzar participacions de l'usuari
        user_participation = await db.draw_participations.find_one({"user_id": str(user["_id"])})
        
        if user_participation:
            await db.draw_participations.update_one(
                {"user_id": str(user["_id"])},
                {
                    "$inc": {
                        "participations": participations,
                        "tickets_count": 1
                    },
                    "$set": {
                        "last_ticket_date": datetime.utcnow()
                    }
                }
            )
        else:
            await db.draw_participations.insert_one({
                "user_id": str(user["_id"]),
                "participations": participations,
                "tickets_count": 1,
                "last_ticket_date": datetime.utcnow()
            })
        
        return {
            "success": True,
            "ticket_number": ticket_data["ticket_number"],
            "establishment": establishment_name,
            "amount": amount,
            "participations": participations,
            "message": f"✅ Tiquet validat! Has generat {participations} participació{'ns' if participations > 1 else ''}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processant tiquet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processant tiquet: {str(e)}")

@api_router.get("/tickets/my-participations")
async def get_my_participations(authorization: str = Header(None)):
    """Obtenir participacions de l'usuari actual"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        participation = await db.draw_participations.find_one({"user_id": str(user["_id"])})
        
        if not participation:
            return {
                "participations": 0,
                "tickets_count": 0,
                "last_ticket_date": None
            }
        
        participation['_id'] = str(participation['_id'])
        return participation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tickets/my-tickets")
async def get_my_tickets(authorization: str = Header(None)):
    """Obtenir historial de tiquets de l'usuari"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        tickets = await db.tickets.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
        for ticket in tickets:
            ticket['_id'] = str(ticket['_id'])
            ticket['id'] = str(ticket['_id'])
        return tickets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# GESTIÓ DE CAMPANYES DE TIQUETS (ADMIN)
# ============================================================================

@api_router.get("/tickets/campaign")
async def get_active_campaign():
    """Obtenir campanya activa de tiquets (públic)"""
    try:
        # Buscar campanya activa dins del període
        campaign = await db.ticket_campaigns.find_one({
            "is_active": True,
            "start_date": {"$lte": datetime.utcnow()},
            "end_date": {"$gte": datetime.utcnow()}
        })
        
        if campaign:
            campaign['_id'] = str(campaign['_id'])
            campaign['id'] = str(campaign['_id'])
        return campaign
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tickets/campaigns")
async def get_all_campaigns(authorization: str = Header(None)):
    """Obtenir totes les campanyes (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        campaigns = await db.ticket_campaigns.find().sort("created_at", -1).to_list(50)
        for campaign in campaigns:
            campaign['_id'] = str(campaign['_id'])
            campaign['id'] = str(campaign['_id'])
        return campaigns
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tickets/campaign")
async def create_campaign(campaign_data: TicketCampaign, authorization: str = Header(None)):
    """Crear campanya de tiquets (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        campaign_dict = campaign_data.dict()
        result = await db.ticket_campaigns.insert_one(campaign_dict)
        campaign_dict['_id'] = str(result.inserted_id)
        campaign_dict['id'] = str(result.inserted_id)
        return campaign_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/admin/tickets/campaign/{campaign_id}")
async def update_campaign(campaign_id: str, campaign_data: TicketCampaign, authorization: str = Header(None)):
    """Actualitzar campanya (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        campaign_dict = campaign_data.dict(exclude_unset=True)
        result = await db.ticket_campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": campaign_dict}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        updated = await db.ticket_campaigns.find_one({"_id": ObjectId(campaign_id)})
        updated['_id'] = str(updated['_id'])
        updated['id'] = str(updated['_id'])
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tickets/campaigns/{campaign_id}/participants/count")
async def get_campaign_participants_count(
    campaign_id: str,
    authorization: str = Header(None)
):
    """Obtenir el nombre de participants d'una campanya"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Comptar participants amb participacions > 0
        count = await db.draw_participations.count_documents({
            "participations": {"$gt": 0}
        })
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tickets/draw")
async def conduct_draw(
    campaign_id: str,
    num_winners: int = 1,
    authorization: str = Header(None)
):
    """Realitzar sorteig i notificar guanyadors (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Obtenir campanya
        campaign = await db.ticket_campaigns.find_one({"_id": ObjectId(campaign_id)})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Obtenir tots els participants amb participacions
        participants = await db.draw_participations.find(
            {"participations": {"$gt": 0}}
        ).to_list(1000)
        
        if len(participants) == 0:
            raise HTTPException(status_code=400, detail="No hi ha participants al sorteig")
        
        # Crear pool de participacions (cada participació = 1 bitllet)
        tickets_pool = []
        for participant in participants:
            user_id = participant["user_id"]
            participations = participant["participations"]
            # Afegir tants bitllets com participacions tingui
            tickets_pool.extend([user_id] * participations)
        
        # Seleccionar guanyadors aleatòriament
        winners = []
        selected_ids = set()
        
        for _ in range(min(num_winners, len(set(tickets_pool)))):  # No més guanyadors que participants únics
            winner_id = random.choice([uid for uid in tickets_pool if uid not in selected_ids])
            selected_ids.add(winner_id)
            
            # Obtenir info del guanyador
            winner_user = await db.users.find_one({"_id": ObjectId(winner_id)})
            if winner_user:
                winners.append({
                    "user_id": winner_id,
                    "name": winner_user.get("name", "Sense nom"),
                    "email": winner_user.get("email", ""),
                    "participations": next(p["participations"] for p in participants if p["user_id"] == winner_id)
                })
        
        # Guardar sorteig a la BD
        draw_doc = {
            "campaign_id": campaign_id,
            "draw_date": datetime.utcnow(),
            "winners": winners,
            "prize_description": campaign.get("prize_description", ""),
            "total_participants": len(set(p["user_id"] for p in participants)),
            "total_participations": sum(p["participations"] for p in participants),
            "status": "completed",
            "created_at": datetime.utcnow()
        }
        
        result = await db.draws.insert_one(draw_doc)
        
        # Notificar guanyadors
        for winner in winners:
            # Obtenir user per push token
            winner_user = await db.users.find_one({"_id": ObjectId(winner["user_id"])})
            if winner_user and winner_user.get("push_token"):
                await send_notification_to_user(
                    winner_user["push_token"],
                    "🎉 Has Guanyat!",
                    f"Felicitats! Has guanyat al sorteig mensual de El Tomb. Premi: {campaign.get('prize_description', 'Premi sorpresa')}"
                )
        
        # Reset participacions de tots els usuaris
        await db.draw_participations.update_many(
            {},
            {"$set": {"participations": 0, "tickets_count": 0}}
        )
        
        return {
            "success": True,
            "draw_id": str(result.inserted_id),
            "winners": winners,
            "total_participants": draw_doc["total_participants"],
            "total_participations": draw_doc["total_participations"],
            "message": f"Sorteig realitzat amb èxit. {len(winners)} guanyador(s) notificat(s) i participacions resetejades."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tickets/draws")
async def get_all_draws(authorization: str = Header(None)):
    """Obtenir historial de sortejos (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        draws = await db.draws.find().sort("draw_date", -1).to_list(50)
        for draw in draws:
            draw['_id'] = str(draw['_id'])
            draw['id'] = str(draw['_id'])
        return draws
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tickets/participants")
async def get_all_participants(authorization: str = Header(None)):
    """Obtenir llista de tots els participants actuals (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        participants = await db.draw_participations.find(
            {"participations": {"$gt": 0}}
        ).sort("participations", -1).to_list(1000)
        
        # Enriquir amb info d'usuari
        enriched = []
        for p in participants:
            user_data = await db.users.find_one({"_id": ObjectId(p["user_id"])})
            if user_data:
                enriched.append({
                    "user_id": p["user_id"],
                    "name": user_data.get("name", "Sense nom"),
                    "email": user_data.get("email", ""),
                    "participations": p["participations"],
                    "tickets_count": p["tickets_count"],
                    "last_ticket_date": p.get("last_ticket_date")
                })
        
        return {
            "total_participants": len(enriched),
            "total_participations": sum(p["participations"] for p in enriched),
            "participants": enriched
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/tickets/campaign/{campaign_id}")
async def delete_campaign(campaign_id: str, authorization: str = Header(None)):
    """Eliminar campanya (admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        result = await db.ticket_campaigns.delete_one({"_id": ObjectId(campaign_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        return {"message": "Campaign deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/promotions")
async def create_promotion(
    promotion: PromotionCreate,
    authorization: str = Header(None)
):
    """Crear una nova promoció"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = str(user['_id'])
    
    # Verificar permisos
    if user.get('role') not in ['admin', 'local_associat', 'entitat_colaboradora', 'membre_consell']:
        raise HTTPException(status_code=403, detail="No tens permís per crear promocions")
    
    promo_dict = promotion.dict()
    promo_dict['created_by'] = user_id
    promo_dict['created_at'] = datetime.utcnow()
    promo_dict['updated_at'] = datetime.utcnow()
    
    # Convertir strings ISO a datetime
    from dateutil import parser
    if isinstance(promo_dict.get('valid_from'), str):
        promo_dict['valid_from'] = parser.isoparse(promo_dict['valid_from'])
    if isinstance(promo_dict.get('valid_until'), str):
        promo_dict['valid_until'] = parser.isoparse(promo_dict['valid_until'])
    
    # Si és admin, aprovada automàticament; si no, pending
    if user.get('role') == 'admin':
        promo_dict['status'] = 'approved'
        promo_dict['reviewed_by'] = user_id
        promo_dict['reviewed_at'] = datetime.utcnow()
    else:
        promo_dict['status'] = 'pending'
    
    result = await db.promotions.insert_one(promo_dict)
    promo_id = str(result.inserted_id)
    promo_dict['_id'] = promo_id
    
    # Crear marcador automàticament amb el nom de la promoció
    tag_name = promo_dict.get('title', 'Promoció')
    await db.tags.update_one(
        {"name": tag_name},
        {
            "$setOnInsert": {
                "name": tag_name,
                "source_type": "promotion",
                "source_id": promo_id,
                "description": f"Marcador creat automàticament per la promoció: {tag_name}",
                "created_at": datetime.utcnow(),
                "user_count": 0
            }
        },
        upsert=True
    )
    
    # Si no és admin, enviar notificació push als administradors
    if user.get('role') != 'admin':
        try:
            # Obtenir tots els tokens push dels admins
            admins = await db.users.find({"role": "admin"}).to_list(100)
            push_tokens = []
            for admin in admins:
                if admin.get('push_token'):
                    push_tokens.append(admin['push_token'])
            
            if push_tokens:
                import httpx
                # Enviar notificació push via Expo Push Notifications
                messages = []
                for token in push_tokens:
                    messages.append({
                        "to": token,
                        "sound": "default",
                        "title": "Nova promoció pendent",
                        "body": f"📢 {promotion.title} - Pendent d'aprovació",
                        "data": {
                            "type": "new_promotion",
                            "promotion_id": str(result.inserted_id),
                            "route": "/admin/offers"
                        }
                    })
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://exp.host/--/api/v2/push/send",
                        json=messages,
                        headers={"Accept": "application/json", "Content-Type": "application/json"}
                    )
                    print(f"✅ Notificacions push enviades als administradors: {response.status_code}")
        except Exception as e:
            print(f"❌ Error enviant notificacions push: {e}")
    
    return promo_dict

@api_router.put("/promotions/{promotion_id}")
async def update_promotion(
    promotion_id: str,
    promotion: PromotionCreate,
    authorization: str = Header(None)
):
    """Actualitzar una promoció"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = str(user['_id'])
    
    existing = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    # Només el creador o admin pot editar
    if str(existing['created_by']) != user_id and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="No tens permís per editar aquesta promoció")
    
    update_data = promotion.dict()
    update_data['updated_at'] = datetime.utcnow()
    
    # Convertir strings ISO a datetime
    from dateutil import parser
    if isinstance(update_data.get('valid_from'), str):
        update_data['valid_from'] = parser.isoparse(update_data['valid_from'])
    if isinstance(update_data.get('valid_until'), str):
        update_data['valid_until'] = parser.isoparse(update_data['valid_until'])
    
    # Si edita un associat, torna a pending
    if user.get('role') != 'admin' and existing.get('status') == 'approved':
        update_data['status'] = 'pending'
        update_data['reviewed_by'] = None
        update_data['reviewed_at'] = None
    
    await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {"$set": update_data}
    )
    
    updated = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    updated['_id'] = str(updated['_id'])
    
    return updated

@api_router.delete("/promotions/{promotion_id}")
async def delete_promotion(
    promotion_id: str,
    authorization: str = Header(None)
):
    """Eliminar una promoció"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = str(user['_id'])
    
    existing = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    # Només el creador o admin pot eliminar
    if str(existing['created_by']) != user_id and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="No tens permís per eliminar aquesta promoció")
    
    await db.promotions.delete_one({"_id": ObjectId(promotion_id)})
    
    return {"success": True, "message": "Promoció eliminada"}

@api_router.post("/promotions/{promotion_id}/approve")
async def approve_promotion(
    promotion_id: str,
    authorization: str = Header(None)
):
    """Aprovar una promoció (només admins)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només administradors poden aprovar promocions")
    
    user_id = str(user['_id'])
    
    # Obtenir la promoció abans d'actualitzar
    promotion = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not promotion:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    result = await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": user_id,
                "reviewed_at": datetime.utcnow(),
                "rejection_reason": None
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    # Enviar notificació push al creador
    try:
        creator = await db.users.find_one({"_id": ObjectId(promotion["created_by"])})
        if creator and creator.get("push_token"):
            send_notification_to_user(
                creator["push_token"],
                "✅ Promoció Aprovada",
                f"La teva promoció '{promotion.get('title', '')}' ha estat aprovada i ja és visible per a tots els usuaris!"
            )
    except Exception as e:
        print(f"Error enviant notificació d'aprovació: {str(e)}")
    
    return {"success": True, "message": "Promoció aprovada"}

@api_router.post("/promotions/{promotion_id}/reject")
async def reject_promotion(
    promotion_id: str,
    reason: str,
    authorization: str = Header(None)
):
    """Rebutjar una promoció (només admins)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només administradors poden rebutjar promocions")
    
    user_id = str(user['_id'])
    
    # Obtenir la promoció abans d'actualitzar
    promotion = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not promotion:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    result = await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {
            "$set": {
                "status": "rejected",
                "reviewed_by": user_id,
                "reviewed_at": datetime.utcnow(),
                "rejection_reason": reason
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promoció no trobada")
    
    # Enviar notificació push al creador
    try:
        creator = await db.users.find_one({"_id": ObjectId(promotion["created_by"])})
        if creator and creator.get("push_token"):
            send_notification_to_user(
                creator["push_token"],
                "❌ Promoció Rebutjada",
                f"La teva promoció '{promotion.get('title', '')}' ha estat rebutjada. Motiu: {reason}"
            )
    except Exception as e:
        print(f"Error enviant notificació de rebuig: {str(e)}")
    
    return {"success": True, "message": "Promoció rebutjada"}

# News endpoints moved to earlier section

# Gift Cards endpoints
@api_router.post("/gift-cards/create")
async def create_gift_card(gift_card_data: GiftCardCreate):
    import random
    import string
    
    # Generate unique code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    gift_card_dict = {
        **gift_card_data.dict(),
        "code": code,
        "balance": gift_card_data.amount,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    result = await db.gift_cards.insert_one(gift_card_dict)
    gift_card_dict['_id'] = str(result.inserted_id)
    
    return gift_card_dict

# ============================================================================
# LOCAL ASSOCIAT - Configuració i Targeta Regal
# ============================================================================

@api_router.get("/local-associat/my-establishment")
async def get_my_establishment(authorization: str = Header(None)):
    """Obtenir l'establiment del local associat actual"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = user.get('_id') or user.get('id')
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    
    # Buscar establiment on l'usuari és propietari
    establishment = await db.establishments.find_one({"owner_id": user_id})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens cap establiment assignat")
    
    establishment['_id'] = str(establishment['_id'])
    establishment['id'] = str(establishment['_id'])
    if establishment.get('owner_id'):
        establishment['owner_id'] = str(establishment['owner_id'])
    
    return establishment

@api_router.put("/local-associat/config")
async def update_local_associat_config(
    config: dict,
    authorization: str = Header(None)
):
    """Actualitzar configuració del local associat (targeta regal, compte bancari)"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = user.get('_id') or user.get('id')
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    
    # Buscar establiment on l'usuari és propietari
    establishment = await db.establishments.find_one({"owner_id": user_id})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens cap establiment assignat")
    
    # Actualitzar configuració
    update_data = {
        "updated_at": datetime.utcnow()
    }
    
    if "accepts_gift_cards" in config:
        update_data["accepts_gift_cards"] = config["accepts_gift_cards"]
    
    if "bank_account_iban" in config:
        update_data["bank_account_iban"] = config["bank_account_iban"]
    
    if "bank_account_holder" in config:
        update_data["bank_account_holder"] = config["bank_account_holder"]
    
    await db.establishments.update_one(
        {"_id": establishment['_id']},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Configuració actualitzada"}

@api_router.get("/local-associat/balance")
async def get_local_associat_balance(authorization: str = Header(None)):
    """Obtenir el saldo acumulat de targetes regal"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user_id = user.get('_id') or user.get('id')
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    
    # Buscar establiment
    establishment = await db.establishments.find_one({"owner_id": user_id})
    
    if not establishment:
        raise HTTPException(status_code=404, detail="No tens cap establiment assignat")
    
    return {
        "balance": establishment.get("gift_card_balance", 0),
        "accepts_gift_cards": establishment.get("accepts_gift_cards", False),
        "has_bank_account": bool(establishment.get("bank_account_iban"))
    }

@api_router.get("/gift-cards/user/{user_id}/balance")
async def get_user_gift_card_balance(user_id: str, authorization: str = Header(None)):
    """Obtenir el saldo de targetes regal d'un usuari (per al botiguer)"""
    # Verificar que el que crida és un local_associat amb establiment
    caller = await get_user_from_token(authorization)
    if not caller:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    # Buscar l'usuari target
    try:
        target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="ID d'usuari invàlid")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuari no trobat")
    
    # Calcular saldo total de les targetes actives
    gift_cards = await db.gift_cards.find({
        "user_id": user_id,
        "status": "active"
    }).to_list(100)
    
    total_balance = sum(gc.get('balance', 0) for gc in gift_cards)
    
    return {
        "user_id": user_id,
        "name": target_user.get('name', ''),
        "email": target_user.get('email', ''),
        "balance": total_balance,
        "cards_count": len(gift_cards)
    }

@api_router.post("/gift-cards/charge")
async def charge_gift_card(
    charge_data: dict,
    authorization: str = Header(None)
):
    """Cobrar d'una targeta regal (botiguer cobra a client)"""
    # Verificar que el que crida és un local_associat amb establiment
    shop_user = await get_user_from_token(authorization)
    if not shop_user:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    shop_user_id = shop_user.get('_id') or shop_user.get('id')
    if isinstance(shop_user_id, str):
        shop_user_id = ObjectId(shop_user_id)
    
    # Verificar que té un establiment que accepta targetes regal
    establishment = await db.establishments.find_one({"owner_id": shop_user_id})
    if not establishment:
        raise HTTPException(status_code=403, detail="No tens cap establiment assignat")
    
    if not establishment.get('accepts_gift_cards'):
        raise HTTPException(status_code=403, detail="El teu establiment no accepta Targetes Regal")
    
    customer_id = charge_data.get('user_id')
    amount = float(charge_data.get('amount', 0))
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="L'import ha de ser positiu")
    
    if amount > 500:
        raise HTTPException(status_code=400, detail="Import màxim per transacció: 500€")
    
    # Obtenir targetes actives del client
    gift_cards = await db.gift_cards.find({
        "user_id": customer_id,
        "status": "active",
        "balance": {"$gt": 0}
    }).sort("created_at", 1).to_list(100)  # Ordenar per antiguitat (FIFO)
    
    total_balance = sum(gc.get('balance', 0) for gc in gift_cards)
    
    if total_balance < amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Saldo insuficient. El client té {total_balance:.2f}€ disponibles."
        )
    
    # Descomptar l'import de les targetes (FIFO)
    remaining = amount
    for gc in gift_cards:
        if remaining <= 0:
            break
        
        card_balance = gc.get('balance', 0)
        to_deduct = min(card_balance, remaining)
        new_balance = card_balance - to_deduct
        
        # Actualitzar targeta
        update_data = {"balance": new_balance}
        if new_balance <= 0:
            update_data["status"] = "used"
        
        await db.gift_cards.update_one(
            {"_id": gc['_id']},
            {"$set": update_data}
        )
        
        remaining -= to_deduct
    
    # Afegir l'import al saldo del botiguer
    current_shop_balance = establishment.get('gift_card_balance', 0)
    new_shop_balance = current_shop_balance + amount
    
    await db.establishments.update_one(
        {"_id": establishment['_id']},
        {"$set": {"gift_card_balance": new_shop_balance}}
    )
    
    # Registrar la transacció
    transaction = {
        "type": "gift_card_charge",
        "customer_id": customer_id,
        "shop_id": str(establishment['_id']),
        "shop_name": establishment.get('name', ''),
        "amount": amount,
        "created_at": datetime.utcnow(),
    }
    await db.gift_card_transactions.insert_one(transaction)
    
    # Calcular nou saldo del client
    updated_cards = await db.gift_cards.find({
        "user_id": customer_id,
        "status": "active"
    }).to_list(100)
    new_customer_balance = sum(gc.get('balance', 0) for gc in updated_cards)
    
    return {
        "success": True,
        "message": f"Cobrament de {amount:.2f}€ realitzat correctament",
        "amount": amount,
        "new_balance": new_customer_balance,
        "shop_balance": new_shop_balance
    }

@api_router.get("/gift-cards/user/{user_id}")
async def get_user_gift_cards(user_id: str):
    gift_cards = await db.gift_cards.find({"user_id": user_id}).to_list(100)
    for gc in gift_cards:
        gc['_id'] = str(gc['_id'])
    return gift_cards

@api_router.get("/gift-cards/{code}")
async def get_gift_card_by_code(code: str):
    gift_card = await db.gift_cards.find_one({"code": code})
    if not gift_card:
        raise HTTPException(status_code=404, detail="Gift card not found")
    gift_card['_id'] = str(gift_card['_id'])
    return gift_card

# PayPal Payment endpoints
@api_router.post("/payments/paypal/create")
async def create_paypal_payment(order_data: PaymentOrderCreate):
    try:
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": order_data.return_url,
                "cancel_url": order_data.cancel_url
            },
            "transactions": [{
                "amount": {
                    "total": str(order_data.amount),
                    "currency": order_data.currency
                },
                "description": "El Tomb de Reus - Tarjeta Regalo"
            }]
        })
        
        if payment.create():
            # Store payment info in DB
            await db.payments.insert_one({
                "payment_id": payment.id,
                "status": "created",
                "amount": order_data.amount,
                "currency": order_data.currency,
                "created_at": datetime.utcnow()
            })
            
            # Get approval URL
            for link in payment.links:
                if link.rel == "approval_url":
                    return {"approval_url": link.href, "payment_id": payment.id}
        else:
            raise HTTPException(status_code=400, detail=payment.error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/paypal/execute")
async def execute_paypal_payment(payment_id: str, payer_id: str, user_id: str, amount: float):
    try:
        payment = paypalrestsdk.Payment.find(payment_id)
        
        if payment.execute({"payer_id": payer_id}):
            # Update payment status
            await db.payments.update_one(
                {"payment_id": payment_id},
                {"$set": {"status": "completed", "payer_id": payer_id, "completed_at": datetime.utcnow()}}
            )
            
            # Create gift card
            gift_card = await create_gift_card(GiftCardCreate(amount=amount, user_id=user_id))
            
            return {"success": True, "gift_card": gift_card}
        else:
            raise HTTPException(status_code=400, detail=payment.error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bizum Payment Endpoints (MOCKUP - Ready for integration)
@api_router.post("/payments/bizum/create")
async def create_bizum_payment(amount: float, user_id: str, phone: str = None):
    """
    MOCKUP: Create Bizum payment
    
    TODO: Integrate with real Bizum API when credentials are available
    
    Steps to activate:
    1. Obtain Bizum API credentials from your bank/payment provider
    2. Install required SDK: pip install bizum-sdk (if available)
    3. Replace this mock with real Bizum API integration
    4. Configure webhook for payment confirmation
    
    Expected flow:
    - Generate Bizum payment request
    - Return payment reference/code for user
    - User completes payment in their bank app
    - Receive webhook confirmation
    - Create gift card upon successful payment
    """
    try:
        # MOCK: Generate a fake payment reference
        payment_reference = f"BIZUM-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # MOCK: Save payment intent to database
        payment_doc = {
            "payment_id": payment_reference,
            "method": "bizum",
            "amount": amount,
            "user_id": user_id,
            "phone": phone,
            "status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.payments.insert_one(payment_doc)
        
        # TODO: Replace with real Bizum API call
        # response = bizum_api.create_payment({
        #     "amount": amount,
        #     "currency": "EUR",
        #     "phone": phone,
        #     "concept": f"Gift Card {amount}€ - El Tomb de Reus",
        #     "callback_url": "https://yourdomain.com/api/payments/bizum/webhook"
        # })
        
        return {
            "success": True,
            "payment_reference": payment_reference,
            "amount": amount,
            "status": "pending",
            "message": "MOCKUP: In production, user would receive payment request in Bizum app",
            "instructions": "Open your bank app and approve the Bizum payment"
        }
    except Exception as e:
        logger.error(f"Error creating Bizum payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payments/bizum/webhook")
async def bizum_payment_webhook(request: Request):
    """
    MOCKUP: Webhook to receive Bizum payment confirmations
    
    TODO: Implement webhook handler when Bizum API is integrated
    
    This endpoint should:
    1. Verify webhook signature from Bizum
    2. Extract payment status and reference
    3. Update payment in database
    4. Create gift card if payment successful
    5. Send notification to user
    """
    try:
        data = await request.json()
        
        # TODO: Verify Bizum webhook signature
        # if not verify_bizum_signature(data, request.headers):
        #     raise HTTPException(status_code=401, detail="Invalid signature")
        
        payment_reference = data.get("payment_reference")
        status = data.get("status")  # "completed", "failed", "cancelled"
        
        # Update payment status
        payment = await db.payments.find_one({"payment_id": payment_reference})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        await db.payments.update_one(
            {"payment_id": payment_reference},
            {"$set": {"status": status, "completed_at": datetime.utcnow()}}
        )
        
        # If successful, create gift card
        if status == "completed":
            gift_card = await create_gift_card(
                GiftCardCreate(
                    amount=payment["amount"],
                    user_id=payment["user_id"]
                )
            )
            
            # TODO: Send notification to user
            # await send_notification(payment["user_id"], "Gift card created!")
            
            return {"success": True, "gift_card_id": gift_card["id"]}
        
        return {"success": True, "status": status}
    except Exception as e:
        logger.error(f"Error processing Bizum webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Data Protection & Consent endpoints
@api_router.get("/privacy-policy")
async def get_privacy_policy():
    """Obtenir el text de la política de protecció de dades"""
    return {
        "text": get_privacy_policy_text(),
        "last_updated": "2025-10-01"
    }

@api_router.get("/consent-history/{user_id}")
async def get_consent_history(user_id: str, authorization: str = Header(None)):
    """Obtenir l'historial de consentiments d'un usuari (requereix autenticació)"""
    if not authorization or not authorization.startswith("token_"):
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    token_user_id = authorization.replace("token_", "")
    
    # Verificar que l'usuari està consultant els seus propis consentiments o és admin
    user = await db.users.find_one({"_id": ObjectId(token_user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    
    if token_user_id != user_id and user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="No tens permís per veure aquest historial")
    
    # Obtenir historial
    history = await db.consent_history.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    for item in history:
        item['_id'] = str(item['_id'])
    
    return history

@api_router.post("/update-consent")
async def update_consent(
    user_id: str,
    consent_given: bool,
    authorization: str = Header(None)
):
    """Actualitzar el consentiment d'un usuari"""
    if not authorization or not authorization.startswith("token_"):
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    token_user_id = authorization.replace("token_", "")
    
    # Verificar que l'usuari està actualitzant el seu propi consentiment
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="No tens permís per modificar aquest consentiment")
    
    # Actualitzar consentiment a l'usuari
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "data_consent": consent_given,
                "data_consent_date": datetime.utcnow()
            }
        }
    )
    
    # Guardar en historial
    consent_history = {
        "user_id": user_id,
        "consent_type": "data_protection",
        "consent_given": consent_given,
        "consent_text": get_privacy_policy_text(),
        "created_at": datetime.utcnow()
    }
    await db.consent_history.insert_one(consent_history)
    
    return {"success": True, "message": "Consentiment actualitzat correctament"}

# Ticket Scanning endpoints
@api_router.post("/tickets/scan")
async def scan_ticket(ticket_data: TicketScanBase):
    # Validate ticket code
    # In production, validate against Neuromobile or internal system
    
    ticket_dict = {
        **ticket_data.dict(),
        "scanned_at": datetime.utcnow()
    }
    
    result = await db.ticket_scans.insert_one(ticket_dict)
    ticket_dict['_id'] = str(result.inserted_id)
    
    return {"success": True, "ticket": ticket_dict, "message": "Ticket escaneado correctamente"}

@api_router.get("/tickets/user/{user_id}")
async def get_user_tickets(user_id: str):
    tickets = await db.ticket_scans.find({"user_id": user_id}).to_list(100)
    for ticket in tickets:
        ticket['_id'] = str(ticket['_id'])
    return tickets

# Tags management endpoints
@api_router.get("/admin/tags")
async def get_tags_stats(authorization: str = Header(None)):
    """
    Retorna estadístiques de tots els tags utilitzats en promocions, esdeveniments i ofertes
    """
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can view tags")
    
    try:
        # Agregar tots els tags de promocions, esdeveniments i ofertes
        pipeline = [
            {
                "$facet": {
                    "promotions": [
                        {"$match": {"tag": {"$exists": True, "$ne": None, "$ne": ""}}},
                        {"$unwind": {"path": "$tag", "preserveNullAndEmptyArrays": False}},
                        {"$group": {
                            "_id": "$tag",
                            "count": {"$sum": 1},
                            "source": {"$addToSet": "promotion"}
                        }}
                    ],
                    "events": [
                        {"$match": {"tags": {"$exists": True, "$not": {"$size": 0}}}},
                        {"$unwind": {"path": "$tags", "preserveNullAndEmptyArrays": False}},
                        {"$group": {
                            "_id": "$tags",
                            "count": {"$sum": 1},
                            "source": {"$addToSet": "event"}
                        }}
                    ],
                    "offers": [
                        {"$match": {"tags": {"$exists": True, "$not": {"$size": 0}}}},
                        {"$unwind": {"path": "$tags", "preserveNullAndEmptyArrays": False}},
                        {"$group": {
                            "_id": "$tags",
                            "count": {"$sum": 1},
                            "source": {"$addToSet": "offer"}
                        }}
                    ]
                }
            }
        ]
        
        # Executar l'aggregació a la col·lecció de promocions
        results = await db.promotions.aggregate(pipeline).to_list(None)
        
        if not results:
            return {"tags": []}
        
        # Combinar resultats
        all_tags = {}
        for source in ["promotions", "events", "offers"]:
            for item in results[0].get(source, []):
                tag = item["_id"]
                if tag not in all_tags:
                    all_tags[tag] = {
                        "tag": tag,
                        "total_uses": 0,
                        "sources": []
                    }
                all_tags[tag]["total_uses"] += item["count"]
                all_tags[tag]["sources"].extend(item["source"])
        
        # Convertir a llista i ordenar
        tags_list = sorted(all_tags.values(), key=lambda x: x["total_uses"], reverse=True)
        
        return {"tags": tags_list}
        
    except Exception as e:
        print(f"Error getting tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/tags/available")
async def get_available_tags():
    """
    Retorna tots els tags disponibles per seleccionar (públic)
    """
    try:
        # Obtenir tags únics de promocions, esdeveniments i ofertes
        promotion_tags = await db.promotions.distinct("tag", {"tag": {"$ne": None, "$ne": ""}})
        event_tags = await db.events.distinct("tags")
        offer_tags = await db.offers.distinct("tags")
        
        # Combinar i eliminar duplicats
        all_tags = list(set(promotion_tags + event_tags + offer_tags))
        all_tags = [tag for tag in all_tags if tag]  # Eliminar valors buits
        
        return {"tags": sorted(all_tags)}
        
    except Exception as e:
        print(f"Error getting available tags: {e}")
        return {"tags": []}

@api_router.put("/users/tags")
async def update_user_tags(
    tags: List[str],
    authorization: str = Header(None)
):
    """
    Actualitza els tags d'interès de l'usuari
    """
    user = await get_user_from_token(authorization)
    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user['_id'])},
            {"$set": {"tags": tags}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Tags updated successfully", "tags": tags}
        
    except Exception as e:
        print(f"Error updating user tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# NOTIFICACIONS
# ============================================================================

@api_router.get("/notifications")
async def get_user_notifications(authorization: str = Header(None)):
    """
    Obtenir totes les notificacions de l'usuari
    """
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        user_id = user["_id"]
        # Buscar per user_id com ObjectId O com string (per compatibilitat)
        notifications = await db.notifications.find({
            "$or": [
                {"user_id": user_id},
                {"user_id": str(user_id)}
            ]
        }).sort("created_at", -1).to_list(100)
        
        for notification in notifications:
            notification['_id'] = str(notification['_id'])
            notification['id'] = str(notification['_id'])
            # Convertir user_id a string també
            if notification.get('user_id'):
                notification['user_id'] = str(notification['user_id'])
        
        return notifications
    except Exception as e:
        print(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    authorization: str = Header(None)
):
    """
    Marcar notificació com a llegida
    """
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        user_id = user["_id"]
        # Buscar per user_id com ObjectId O com string (per compatibilitat)
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "$or": [
                    {"user_id": user_id},
                    {"user_id": str(user_id)}
                ]
            },
            {"$set": {"read": True, "read_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    authorization: str = Header(None)
):
    """
    Eliminar notificació
    """
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        user_id = user["_id"]
        # Buscar per user_id com ObjectId O com string (per compatibilitat)
        result = await db.notifications.delete_one({
            "_id": ObjectId(notification_id),
            "$or": [
                {"user_id": user_id},
                {"user_id": str(user_id)}
            ]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification deleted"}
    except Exception as e:
        print(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@api_router.get("/")
async def root():
    return {"message": "El Tomb de Reus API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)
# Include admin routes
app.include_router(admin_router, prefix="/api")

# Routes included above

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for landing page
landing_path = Path(__file__).parent / "static"
if landing_path.exists():
    # Serve static assets (CSS, JS, images)
    if (landing_path / "assets").exists():
        app.mount("/landing/assets", StaticFiles(directory=str(landing_path / "assets")), name="landing-assets")
    
    # Serve main files
    @app.get("/landing/{file_name}")
    async def serve_landing_file(file_name: str):
        """Servir fitxers de la landing page"""
        file_path = landing_path / file_name
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="File not found")
    
    # Serve landing page at root /landing
    @app.get("/landing")
    async def serve_landing():
        """Servir la landing page principal"""
        index_path = landing_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    # Serve tomb-pagines files
    @app.get("/landing/tomb-pagines/{file_name}")
    async def serve_tomb_pagina(file_name: str):
        """Servir fitxers de les pàgines individuals"""
        file_path = landing_path / "tomb-pagines" / file_name
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Serve tomb-pagines files under /api/ route for proxy compatibility
    @app.get("/api/landing/tomb-pagines/{file_name}")
    async def serve_tomb_pagina_api(file_name: str):
        """Servir fitxers de les pàgines individuals (via /api/)"""
        file_path = landing_path / "tomb-pagines" / file_name
        if file_path.exists() and file_path.is_file():
            response = FileResponse(file_path)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Last-Modified"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")
            response.headers["ETag"] = f'"{datetime.now().timestamp()}"'
            return response
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Serve assets under /api/ route for proxy compatibility
    @app.get("/api/landing/assets/{file_name}")
    async def serve_landing_assets_api(file_name: str):
        """Servir assets de la landing (logos, imatges, etc.)"""
        file_path = landing_path / "assets" / file_name
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="Asset not found")

# Serve map HTML files from frontend/public
frontend_public_path = Path(__file__).parent.parent / "frontend" / "public"
if frontend_public_path.exists():
    @app.get("/map.html")
    async def serve_map():
        """Servir el mapa general"""
        map_path = frontend_public_path / "map.html"
        if map_path.exists():
            return FileResponse(map_path)
        raise HTTPException(status_code=404, detail="Map file not found")
    
    @app.get("/event-map.html")
    async def serve_event_map():
        """Servir el mapa d'esdeveniments"""
        map_path = frontend_public_path / "event-map.html"
        if map_path.exists():
            return FileResponse(map_path)
        raise HTTPException(status_code=404, detail="Event map file not found")

# Endpoint per netejar les descripcions dels establiments (eliminar HTML tags)
@app.post("/api/admin/clean-descriptions")
async def clean_establishment_descriptions():
    """Netejar les descripcions dels establiments eliminant HTML tags"""
    import re
    
    def clean_description(desc):
        if not desc:
            return desc
        cleaned = re.sub(r'</?p[^>]*>', '', desc)
        cleaned = re.sub(r'</?br[^>]*>', ' ', cleaned)
        cleaned = re.sub(r'</?[a-z]+[^>]*>', '', cleaned)
        cleaned = cleaned.replace('&nbsp;', ' ')
        cleaned = cleaned.replace('&amp;', '&')
        cleaned = cleaned.replace('&lt;', '<')
        cleaned = cleaned.replace('&gt;', '>')
        cleaned = cleaned.replace('&quot;', '"')
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip()
        return cleaned
    
    try:
        updated_count = 0
        cursor = db.establishments.find()
        async for est in cursor:
            desc = est.get('description', '')
            if desc:
                cleaned = clean_description(desc)
                if cleaned != desc:
                    await db.establishments.update_one(
                        {'_id': est['_id']},
                        {'$set': {'description': cleaned}}
                    )
                    updated_count += 1
        
        return {"success": True, "updated": updated_count, "message": f"S'han netejat {updated_count} descripcions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rutes amigables per a les pàgines web estàtiques (amb prefix /api/ per passar pel proxy)
@app.get("/api/que-es-el-tomb/")
@app.get("/api/que-es-el-tomb")
async def serve_sobre_nosaltres():
    """Servir la pàgina 'Què és El Tomb?'"""
    file_path = landing_path / "tomb-pagines" / "tomb-sobre.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/mapa-web/")
@app.get("/api/mapa-web")
async def serve_mapa_page():
    """Servir la pàgina del mapa"""
    file_path = landing_path / "tomb-pagines" / "tomb-mapa.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/establiments-web/")
@app.get("/api/establiments-web")
async def serve_establiments_page():
    """Servir la pàgina d'establiments"""
    file_path = landing_path / "tomb-pagines" / "tomb-establiments.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/ofertes-web/")
@app.get("/api/ofertes-web")
async def serve_ofertes_page():
    """Servir la pàgina d'ofertes"""
    file_path = landing_path / "tomb-pagines" / "tomb-ofertes.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/esdeveniments-web/")
@app.get("/api/esdeveniments-web")
async def serve_esdeveniments_page():
    """Servir la pàgina d'esdeveniments"""
    file_path = landing_path / "tomb-pagines" / "tomb-esdeveniments.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

@app.get("/api/noticies-web/")
@app.get("/api/noticies-web")
async def serve_noticies_page():
    """Servir la pàgina de notícies"""
    file_path = landing_path / "tomb-pagines" / "tomb-noticies.html"
    if file_path.exists():
        return FileResponse(file_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Page not found")

# Service Worker route - servir des de dist (producció) o frontend/public (desenvolupament)
dist_path_for_sw = Path(__file__).parent / "dist"
frontend_public_path = Path(__file__).parent.parent / "frontend" / "public"

@app.get("/sw.js")
async def serve_service_worker():
    """Servir el Service Worker per Web Push"""
    # Primer intentar des de dist (producció)
    sw_path = dist_path_for_sw / "sw.js"
    if sw_path.exists():
        return FileResponse(sw_path, media_type="application/javascript")
    
    # Fallback a frontend/public (desenvolupament)
    sw_path = frontend_public_path / "sw.js"
    if sw_path.exists():
        return FileResponse(sw_path, media_type="application/javascript")
    
    raise HTTPException(status_code=404, detail="Service Worker not found")

@app.get("/manifest.json")
async def serve_manifest():
    """Servir el manifest PWA"""
    manifest_path = frontend_public_path / "manifest.json"
    if manifest_path.exists():
        return FileResponse(manifest_path, media_type="application/json")
    raise HTTPException(status_code=404, detail="Manifest not found")

# Mount Expo web app (after all API routes)
dist_path = Path(__file__).parent / "dist"
if dist_path.exists():
    logger.info(f"Mounting Expo web app from {dist_path}")
    
    # Servir assets
    if (dist_path / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="app-assets")
    
    if (dist_path / "_expo").exists():
        app.mount("/_expo", StaticFiles(directory=str(dist_path / "_expo")), name="expo-assets")
    
    # Ruta principal - servir index.html
    @app.get("/")
    async def serve_frontend():
        return FileResponse(dist_path / "index.html")
    
    # Catch-all per SPA routing
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # Si és un fitxer que existeix, servir-lo
        file_path = dist_path / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Sinó, servir index.html per SPA routing
        return FileResponse(dist_path / "index.html")
else:
    logger.warning(f"dist directory not found at {dist_path}")
    
    @app.get("/")
    async def root_fallback():
        from fastapi.responses import HTMLResponse
        return HTMLResponse("""<!DOCTYPE html><html><head><title>El Tomb de Reus</title></head><body><h1>El Tomb de Reus - API</h1><p><a href="/api/health">API Health</a></p></body></html>""")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("startup")
async def startup_event():
    """Inicialitzar el scheduler de notícies automàtiques"""
    logger.info("Iniciant scheduler de notícies...")
    start_news_scheduler()
    logger.info("Scheduler de notícies iniciat correctament")
    
    # Afegir COTTONI si no existeix
    try:
        existing_cottoni = await db.establishments.find_one({"name": "COTTONI Toni Cano"})
        if not existing_cottoni:
            cottoni_data = {
                "name": "COTTONI Toni Cano",
                "address": "Carrer de la Galera, 19",
                "latitude": 41.15483,
                "longitude": 1.10790,
                "status": "A Soci",
                "category": "Moda",
                "altres_categories": "roba home",
                "phone": "",
                "email": "",
                "visible_in_public_list": True,
                "establishment_type": "local_associat",
                "description": "Botiga de roba per home",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = await db.establishments.insert_one(cottoni_data)
            print(f"✅ COTTONI Toni Cano afegit automàticament amb ID: {result.inserted_id}")
        else:
            print("✅ COTTONI Toni Cano ja existeix")
        
        # Eliminar COTTONI duplicats amb coordenades incorrectes
        await db.establishments.delete_many({
            "name": "COTTONI",
            "$or": [
                {"latitude": 41.1546872},
                {"latitude": {"$ne": 41.15483}}
            ]
        })
        print("✅ Duplicats de COTTONI eliminats")
        
    except Exception as e:
        print(f"⚠️ Error processant COTTONI: {e}")

@app.get("/api/download/hosteleria-pdf")
async def download_hosteleria_pdf():
    """Descarregar PDF amb tots els locals d'hosteleria"""
    # Intentar primer des de /app
    pdf_path = Path("/app/locals_hosteleria.pdf")
    
    # Si no existeix, intentar des de static
    if not pdf_path.exists():
        pdf_path = Path(__file__).parent / "static" / "locals_hosteleria.pdf"
    
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF no trobat. Genera'l primer executant el script.")
    
    return FileResponse(
        path=pdf_path,
        filename="Hosteleria_ReusComercFutur.pdf",
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=Hosteleria_ReusComercFutur.pdf"
        }
    )

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Endpoint per descarregar el ZIP amb el codi actualitzat
@app.get("/api/descarrega-codi")
async def download_code_zip():
    """Descarregar el ZIP amb tot el codi actualitzat"""
    zip_path = Path(__file__).parent / "static" / "reusapp_completa.zip"
    if zip_path.exists():
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename="reusapp_completa.zip"
        )
    raise HTTPException(status_code=404, detail="ZIP not found")
