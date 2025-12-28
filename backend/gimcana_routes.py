"""
Sistema de Gincanes amb QR Codes
Permet crear campanyes on els usuaris han d'escanejar QR codes
distribuïts per establiments per completar una cartilla i participar en sortejos.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import secrets
import logging

logger = logging.getLogger(__name__)

gimcana_router = APIRouter(prefix="/api/gimcana", tags=["Gimcana"])

# Database reference (will be set from server.py)
db = None

def set_database(database):
    global db
    db = database


# ============== MODELS ==============

class GimcanaCampaignCreate(BaseModel):
    name: str = Field(..., description="Nom de la campanya")
    description: str = Field("", description="Descripció de la campanya")
    total_qr_codes: int = Field(..., ge=1, le=100, description="Quantitat de QR a escanejar")
    start_date: datetime = Field(..., description="Data d'inici")
    end_date: datetime = Field(..., description="Data de fi")
    prize_description: str = Field("", description="Descripció del premi")
    rules: str = Field("", description="Bases de participació")
    image_url: Optional[str] = None
    is_active: bool = True


class QRCodeCreate(BaseModel):
    campaign_id: str
    establishment_id: Optional[str] = None
    establishment_name: Optional[str] = None
    location_hint: Optional[str] = None  # Pista de on trobar el QR


class ScanQRRequest(BaseModel):
    campaign_id: str
    qr_code: str


# ============== HELPER FUNCTIONS ==============

async def get_user_from_token(authorization: str):
    """Obtenir usuari des del token"""
    if not authorization:
        return None
    
    token = authorization.replace("Bearer ", "")
    user = await db.users.find_one({"token": token})
    return user


def generate_qr_code():
    """Generar un codi QR únic"""
    return f"GINCANA-{secrets.token_hex(8).upper()}"


# ============== ADMIN ENDPOINTS ==============

@gimcana_router.get("/campaigns")
async def get_campaigns(authorization: str = Header(None)):
    """Obtenir totes les campanyes de gimcana"""
    user = await get_user_from_token(authorization)
    
    # Si és admin, mostra totes. Si no, només les actives
    if user and user.get('role') == 'admin':
        campaigns = await db.gimcana_campaigns.find().sort("created_at", -1).to_list(100)
    else:
        now = datetime.utcnow()
        campaigns = await db.gimcana_campaigns.find({
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        }).sort("created_at", -1).to_list(100)
    
    for c in campaigns:
        c['_id'] = str(c['_id'])
        # Obtenir estadístiques
        participants = await db.gimcana_progress.count_documents({"campaign_id": str(c['_id'])})
        completed = await db.gimcana_progress.count_documents({
            "campaign_id": str(c['_id']),
            "completed": True
        })
        c['stats'] = {
            'participants': participants,
            'completed': completed
        }
    
    return campaigns


@gimcana_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, authorization: str = Header(None)):
    """Obtenir detalls d'una campanya"""
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    campaign['_id'] = str(campaign['_id'])
    
    # Obtenir QR codes de la campanya
    qr_codes = await db.gimcana_qr_codes.find({"campaign_id": campaign_id}).to_list(100)
    for qr in qr_codes:
        qr['_id'] = str(qr['_id'])
    campaign['qr_codes'] = qr_codes
    
    # Estadístiques
    participants = await db.gimcana_progress.count_documents({"campaign_id": campaign_id})
    completed = await db.gimcana_progress.count_documents({
        "campaign_id": campaign_id,
        "completed": True
    })
    campaign['stats'] = {
        'participants': participants,
        'completed': completed
    }
    
    return campaign


@gimcana_router.post("/campaigns")
async def create_campaign(campaign: GimcanaCampaignCreate, authorization: str = Header(None)):
    """Crear una nova campanya de gimcana (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden crear campanyes")
    
    campaign_data = campaign.dict()
    campaign_data['created_at'] = datetime.utcnow()
    campaign_data['created_by'] = str(user['_id'])
    campaign_data['created_by_name'] = user.get('name', 'Admin')
    
    result = await db.gimcana_campaigns.insert_one(campaign_data)
    campaign_id = str(result.inserted_id)
    
    # Generar els QR codes automàticament
    qr_codes = []
    for i in range(campaign.total_qr_codes):
        qr_code = {
            "campaign_id": campaign_id,
            "code": generate_qr_code(),
            "number": i + 1,
            "establishment_id": None,
            "establishment_name": f"Punt {i + 1}",
            "location_hint": "",
            "created_at": datetime.utcnow()
        }
        await db.gimcana_qr_codes.insert_one(qr_code)
        qr_codes.append(qr_code)
    
    logger.info(f"Campanya de gimcana creada: {campaign.name} amb {campaign.total_qr_codes} QR codes")
    
    return {
        "success": True,
        "campaign_id": campaign_id,
        "qr_codes_generated": len(qr_codes),
        "message": f"Campanya creada amb {campaign.total_qr_codes} codis QR"
    }


@gimcana_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, campaign: GimcanaCampaignCreate, authorization: str = Header(None)):
    """Actualitzar una campanya (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden editar campanyes")
    
    existing = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    update_data = campaign.dict()
    update_data['updated_at'] = datetime.utcnow()
    
    # Si canvia el nombre de QR codes, regenerar-los
    if campaign.total_qr_codes != existing.get('total_qr_codes'):
        # Eliminar QR antics
        await db.gimcana_qr_codes.delete_many({"campaign_id": campaign_id})
        
        # Generar nous
        for i in range(campaign.total_qr_codes):
            qr_code = {
                "campaign_id": campaign_id,
                "code": generate_qr_code(),
                "number": i + 1,
                "establishment_id": None,
                "establishment_name": f"Punt {i + 1}",
                "location_hint": "",
                "created_at": datetime.utcnow()
            }
            await db.gimcana_qr_codes.insert_one(qr_code)
    
    await db.gimcana_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Campanya actualitzada"}


@gimcana_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, authorization: str = Header(None)):
    """Eliminar una campanya (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden eliminar campanyes")
    
    # Eliminar campanya
    await db.gimcana_campaigns.delete_one({"_id": ObjectId(campaign_id)})
    
    # Eliminar QR codes associats
    await db.gimcana_qr_codes.delete_many({"campaign_id": campaign_id})
    
    # Eliminar progrés dels usuaris
    await db.gimcana_progress.delete_many({"campaign_id": campaign_id})
    
    return {"success": True, "message": "Campanya eliminada"}


# ============== QR CODE MANAGEMENT ==============

@gimcana_router.get("/campaigns/{campaign_id}/qr-codes")
async def get_qr_codes(campaign_id: str, authorization: str = Header(None)):
    """Obtenir tots els QR codes d'una campanya"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden veure els QR codes")
    
    qr_codes = await db.gimcana_qr_codes.find({"campaign_id": campaign_id}).sort("number", 1).to_list(100)
    
    for qr in qr_codes:
        qr['_id'] = str(qr['_id'])
        # Comptar quants usuaris han escanejat aquest QR
        scans = await db.gimcana_progress.count_documents({
            "campaign_id": campaign_id,
            f"scanned_codes.{qr['code']}": {"$exists": True}
        })
        qr['scan_count'] = scans
    
    return qr_codes


@gimcana_router.put("/qr-codes/{qr_id}")
async def update_qr_code(qr_id: str, data: dict, authorization: str = Header(None)):
    """Actualitzar informació d'un QR code (establiment, ubicació)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden editar QR codes")
    
    update_data = {
        "establishment_id": data.get('establishment_id'),
        "establishment_name": data.get('establishment_name'),
        "location_hint": data.get('location_hint'),
        "updated_at": datetime.utcnow()
    }
    
    await db.gimcana_qr_codes.update_one(
        {"_id": ObjectId(qr_id)},
        {"$set": update_data}
    )
    
    return {"success": True}


# ============== USER ENDPOINTS ==============

@gimcana_router.get("/my-progress/{campaign_id}")
async def get_my_progress(campaign_id: str, authorization: str = Header(None)):
    """Obtenir el progrés de l'usuari en una campanya"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Has d'iniciar sessió")
    
    user_id = str(user['_id'])
    
    # Obtenir campanya
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    # Obtenir progrés de l'usuari
    progress = await db.gimcana_progress.find_one({
        "campaign_id": campaign_id,
        "user_id": user_id
    })
    
    # Obtenir QR codes de la campanya
    qr_codes = await db.gimcana_qr_codes.find({"campaign_id": campaign_id}).sort("number", 1).to_list(100)
    
    if not progress:
        progress = {
            "campaign_id": campaign_id,
            "user_id": user_id,
            "scanned_codes": {},
            "scanned_count": 0,
            "completed": False,
            "completed_at": None,
            "entered_raffle": False
        }
    else:
        progress['_id'] = str(progress['_id'])
    
    # Preparar llista de QR codes amb estat
    qr_list = []
    for qr in qr_codes:
        qr_info = {
            "number": qr['number'],
            "establishment_name": qr.get('establishment_name', f"Punt {qr['number']}"),
            "location_hint": qr.get('location_hint', ''),
            "scanned": qr['code'] in progress.get('scanned_codes', {}),
            "scanned_at": progress.get('scanned_codes', {}).get(qr['code'])
        }
        qr_list.append(qr_info)
    
    campaign['_id'] = str(campaign['_id'])
    
    return {
        "campaign": {
            "id": campaign['_id'],
            "name": campaign['name'],
            "description": campaign.get('description', ''),
            "total_qr_codes": campaign['total_qr_codes'],
            "prize_description": campaign.get('prize_description', ''),
            "rules": campaign.get('rules', ''),
            "end_date": campaign['end_date'],
            "image_url": campaign.get('image_url')
        },
        "progress": {
            "scanned_count": progress.get('scanned_count', 0),
            "total": campaign['total_qr_codes'],
            "completed": progress.get('completed', False),
            "completed_at": progress.get('completed_at'),
            "entered_raffle": progress.get('entered_raffle', False),
            "qr_codes": qr_list
        }
    }


@gimcana_router.post("/scan")
async def scan_qr_code(request: ScanQRRequest, authorization: str = Header(None)):
    """Escanejar un QR code"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Has d'iniciar sessió per participar")
    
    user_id = str(user['_id'])
    campaign_id = request.campaign_id
    qr_code = request.qr_code.strip().upper()
    
    # Verificar que la campanya existeix i està activa
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    now = datetime.utcnow()
    if not campaign.get('is_active') or now < campaign['start_date'] or now > campaign['end_date']:
        raise HTTPException(status_code=400, detail="Aquesta campanya no està activa")
    
    # Verificar que el QR code existeix i pertany a aquesta campanya
    qr = await db.gimcana_qr_codes.find_one({
        "campaign_id": campaign_id,
        "code": qr_code
    })
    
    if not qr:
        raise HTTPException(status_code=404, detail="Codi QR no vàlid per aquesta campanya")
    
    # Obtenir o crear progrés de l'usuari
    progress = await db.gimcana_progress.find_one({
        "campaign_id": campaign_id,
        "user_id": user_id
    })
    
    if not progress:
        progress = {
            "campaign_id": campaign_id,
            "user_id": user_id,
            "user_name": user.get('name', 'Usuari'),
            "user_email": user.get('email', ''),
            "scanned_codes": {},
            "scanned_count": 0,
            "completed": False,
            "completed_at": None,
            "entered_raffle": False,
            "created_at": now
        }
        result = await db.gimcana_progress.insert_one(progress)
        progress['_id'] = result.inserted_id
    
    # Verificar si ja ha escanejat aquest QR
    if qr_code in progress.get('scanned_codes', {}):
        return {
            "success": False,
            "already_scanned": True,
            "message": f"Ja has escanejat aquest QR ({qr.get('establishment_name', 'Punt ' + str(qr['number']))})",
            "scanned_count": progress['scanned_count'],
            "total": campaign['total_qr_codes'],
            "completed": progress['completed']
        }
    
    # Registrar l'escaneig
    progress['scanned_codes'][qr_code] = now.isoformat()
    progress['scanned_count'] = len(progress['scanned_codes'])
    
    # Verificar si ha completat
    completed_now = False
    if progress['scanned_count'] >= campaign['total_qr_codes']:
        progress['completed'] = True
        progress['completed_at'] = now
        completed_now = True
    
    # Actualitzar a la base de dades
    await db.gimcana_progress.update_one(
        {"_id": progress['_id']},
        {"$set": {
            "scanned_codes": progress['scanned_codes'],
            "scanned_count": progress['scanned_count'],
            "completed": progress['completed'],
            "completed_at": progress.get('completed_at')
        }}
    )
    
    logger.info(f"Usuari {user.get('email')} ha escanejat QR {qr_code} de la campanya {campaign['name']}")
    
    return {
        "success": True,
        "message": f"QR escanejat correctament! ({qr.get('establishment_name', 'Punt ' + str(qr['number']))})",
        "qr_info": {
            "number": qr['number'],
            "establishment_name": qr.get('establishment_name'),
            "location_hint": qr.get('location_hint')
        },
        "scanned_count": progress['scanned_count'],
        "total": campaign['total_qr_codes'],
        "completed": progress['completed'],
        "just_completed": completed_now,
        "prize_description": campaign.get('prize_description', '') if completed_now else None
    }


@gimcana_router.post("/enter-raffle/{campaign_id}")
async def enter_raffle(campaign_id: str, authorization: str = Header(None)):
    """Entrar al sorteig després de completar la cartilla"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Has d'iniciar sessió")
    
    user_id = str(user['_id'])
    
    # Verificar que ha completat la campanya
    progress = await db.gimcana_progress.find_one({
        "campaign_id": campaign_id,
        "user_id": user_id
    })
    
    if not progress:
        raise HTTPException(status_code=400, detail="No has participat en aquesta campanya")
    
    if not progress.get('completed'):
        raise HTTPException(status_code=400, detail="Has de completar tots els QR codes primer")
    
    if progress.get('entered_raffle'):
        raise HTTPException(status_code=400, detail="Ja estàs inscrit al sorteig")
    
    # Inscriure al sorteig
    await db.gimcana_progress.update_one(
        {"_id": progress['_id']},
        {"$set": {
            "entered_raffle": True,
            "entered_raffle_at": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "message": "T'has inscrit al sorteig correctament!"
    }


# ============== ADMIN STATISTICS ==============

@gimcana_router.get("/campaigns/{campaign_id}/participants")
async def get_participants(campaign_id: str, authorization: str = Header(None)):
    """Obtenir llista de participants d'una campanya (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden veure els participants")
    
    participants = await db.gimcana_progress.find({"campaign_id": campaign_id}).sort("scanned_count", -1).to_list(1000)
    
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    total_qr = campaign['total_qr_codes'] if campaign else 0
    
    result = []
    for p in participants:
        result.append({
            "_id": str(p['_id']),
            "user_name": p.get('user_name', 'Usuari'),
            "user_email": p.get('user_email', ''),
            "scanned_count": p.get('scanned_count', 0),
            "total": total_qr,
            "completed": p.get('completed', False),
            "completed_at": p.get('completed_at'),
            "entered_raffle": p.get('entered_raffle', False),
            "created_at": p.get('created_at')
        })
    
    return result


@gimcana_router.get("/campaigns/{campaign_id}/raffle-participants")
async def get_raffle_participants(campaign_id: str, authorization: str = Header(None)):
    """Obtenir participants inscrits al sorteig (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden veure els participants")
    
    participants = await db.gimcana_progress.find({
        "campaign_id": campaign_id,
        "completed": True,
        "entered_raffle": True
    }).to_list(1000)
    
    result = []
    for p in participants:
        result.append({
            "_id": str(p['_id']),
            "user_name": p.get('user_name', 'Usuari'),
            "user_email": p.get('user_email', ''),
            "completed_at": p.get('completed_at'),
            "entered_raffle_at": p.get('entered_raffle_at')
        })
    
    return result
