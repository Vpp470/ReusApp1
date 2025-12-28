"""
Sistema de Gimcanes amb QR Codes
Permet crear campanyes on els usuaris han d'escanejar QR codes
distribuïts per establiments per completar una cartilla i guanyar premis.

Tipus de premis:
- "direct": El premi es rep automàticament al completar
- "raffle": L'usuari entra en un sorteig que es realitza posteriorment
"""

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import secrets
import logging
import random
import io

logger = logging.getLogger(__name__)

gimcana_router = APIRouter(prefix="/api/gimcana", tags=["Gimcana"])

# Database reference (will be set from server.py)
db = None

def set_database(database):
    global db
    db = database


# ============== MODELS ==============

class QRItemCreate(BaseModel):
    """Informació d'un punt QR individual"""
    establishment_name: str = Field(..., description="Nom del punt/establiment")
    location_hint: Optional[str] = Field("", description="Pista d'ubicació")
    image_url: Optional[str] = Field(None, description="Imatge individual del QR (opcional)")

class GimcanaCampaignCreate(BaseModel):
    name: str = Field(..., description="Nom de la campanya")
    description: str = Field("", description="Descripció de la campanya")
    total_qr_codes: int = Field(..., ge=1, le=100, description="Quantitat de QR a escanejar")
    start_date: datetime = Field(..., description="Data d'inici")
    end_date: datetime = Field(..., description="Data de fi")
    
    # Premi
    prize_type: str = Field("raffle", description="Tipus de premi: 'direct' o 'raffle'")
    prize_description: str = Field("", description="Descripció del premi")
    prize_image_url: Optional[str] = Field(None, description="Imatge del premi (opcional)")
    
    # Bases
    rules: str = Field("", description="Bases de participació (text)")
    rules_url: Optional[str] = Field(None, description="URL a document de bases (PDF)")
    
    # Imatge de campanya
    image_url: Optional[str] = Field(None, description="Imatge principal de la campanya")
    
    # QR items amb noms personalitzats
    qr_items: Optional[List[QRItemCreate]] = Field(None, description="Llista de punts QR amb noms personalitzats")
    
    # Data del sorteig (només si prize_type == 'raffle')
    raffle_date: Optional[datetime] = Field(None, description="Data del sorteig")
    
    is_active: bool = True


class QRCodeCreate(BaseModel):
    campaign_id: str
    establishment_id: Optional[str] = None
    establishment_name: Optional[str] = None
    location_hint: Optional[str] = None
    image_url: Optional[str] = None


class ScanQRRequest(BaseModel):
    campaign_id: str
    qr_code: str


class RaffleExecuteRequest(BaseModel):
    """Sol·licitud per executar un sorteig"""
    num_winners: int = Field(1, ge=1, le=10, description="Nombre de guanyadors")


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
    return f"GIMCANA-{secrets.token_hex(8).upper()}"


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


# IMPORTANT: Aquest endpoint ha d'anar ABANS de /campaigns/{campaign_id}
@gimcana_router.get("/campaigns/active")
async def get_active_campaigns(authorization: str = Header(None)):
    """Obtenir campanyes actives amb el progrés de l'usuari"""
    user = await get_user_from_token(authorization)
    
    now = datetime.utcnow()
    campaigns = await db.gimcana_campaigns.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).sort("start_date", -1).to_list(100)
    
    user_id = str(user['_id']) if user else None
    
    for c in campaigns:
        c['_id'] = str(c['_id'])
        
        # Obtenir progrés de l'usuari si ha iniciat sessió
        if user_id:
            progress = await db.gimcana_progress.find_one({
                "campaign_id": str(c['_id']),
                "user_id": user_id
            })
            if progress:
                c['user_progress'] = {
                    "scanned_count": len(progress.get('scanned_qrs', [])),
                    "completed": progress.get('completed', False),
                    "entered_raffle": progress.get('entered_raffle', False)
                }
            else:
                c['user_progress'] = {
                    "scanned_count": 0,
                    "completed": False,
                    "entered_raffle": False
                }
        else:
            c['user_progress'] = None
    
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


@gimcana_router.get("/campaigns/{campaign_id}/progress")
async def get_user_progress(campaign_id: str, authorization: str = Header(None)):
    """Obtenir el progrés de l'usuari en una campanya"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Has d'iniciar sessió")
    
    user_id = str(user['_id'])
    
    progress = await db.gimcana_progress.find_one({
        "campaign_id": campaign_id,
        "user_id": user_id
    })
    
    if not progress:
        return {
            "scanned_qrs": [],
            "completed": False,
            "entered_raffle": False
        }
    
    # Convertir ObjectIds dels QRs escanejats a strings
    scanned_qrs = []
    for qr_id in progress.get('scanned_qrs', []):
        if isinstance(qr_id, ObjectId):
            scanned_qrs.append(str(qr_id))
        else:
            scanned_qrs.append(qr_id)
    
    return {
        "scanned_qrs": scanned_qrs,
        "completed": progress.get('completed', False),
        "completed_at": progress.get('completed_at'),
        "entered_raffle": progress.get('entered_raffle', False),
        "entered_raffle_at": progress.get('entered_raffle_at'),
        "is_winner": progress.get('is_winner', False)
    }


@gimcana_router.post("/campaigns")
async def create_campaign(campaign: GimcanaCampaignCreate, authorization: str = Header(None)):
    """Crear una nova campanya de gimcana (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden crear campanyes")
    
    campaign_data = campaign.dict(exclude={'qr_items'})
    campaign_data['created_at'] = datetime.utcnow()
    campaign_data['created_by'] = str(user['_id'])
    campaign_data['created_by_name'] = user.get('name', 'Admin')
    
    # Camps addicionals per al sistema de sorteig
    campaign_data['raffle_executed'] = False
    campaign_data['raffle_executed_at'] = None
    campaign_data['winners'] = []
    
    result = await db.gimcana_campaigns.insert_one(campaign_data)
    campaign_id = str(result.inserted_id)
    
    # Generar els QR codes amb noms personalitzats si s'han proporcionat
    qr_codes = []
    qr_items = campaign.qr_items or []
    
    for i in range(campaign.total_qr_codes):
        # Usar noms personalitzats si existeixen
        if i < len(qr_items):
            qr_item = qr_items[i]
            establishment_name = qr_item.establishment_name
            location_hint = qr_item.location_hint or ""
            image_url = qr_item.image_url
        else:
            establishment_name = f"Punt {i + 1}"
            location_hint = ""
            image_url = None
        
        qr_code = {
            "campaign_id": campaign_id,
            "code": generate_qr_code(),
            "number": i + 1,
            "establishment_id": None,
            "establishment_name": establishment_name,
            "location_hint": location_hint,
            "image_url": image_url,
            "created_at": datetime.utcnow()
        }
        await db.gimcana_qr_codes.insert_one(qr_code)
        qr_codes.append(qr_code)
    
    logger.info(f"Campanya de gimcana creada: {campaign.name} amb {campaign.total_qr_codes} QR codes (tipus premi: {campaign.prize_type})")
    
    return {
        "success": True,
        "campaign_id": campaign_id,
        "qr_codes_generated": len(qr_codes),
        "message": f"Campanya creada amb {campaign.total_qr_codes} codis QR",
        "prize_type": campaign.prize_type
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


@gimcana_router.post("/admin/fix-qr-codes")
async def fix_qr_codes(authorization: str = Header(None)):
    """Corregir els codis QR canviant GINCANA per GIMCANA (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden fer això")
    
    # Buscar tots els codis amb GINCANA
    qr_codes = await db.gimcana_qr_codes.find({"code": {"$regex": "^GINCANA-"}}).to_list(1000)
    
    updated = 0
    for qr in qr_codes:
        old_code = qr['code']
        new_code = old_code.replace('GINCANA-', 'GIMCANA-')
        await db.gimcana_qr_codes.update_one(
            {"_id": qr['_id']},
            {"$set": {"code": new_code}}
        )
        updated += 1
    
    return {"success": True, "message": f"Actualitzats {updated} codis QR", "updated": updated}


# ============== QR CODE MANAGEMENT ==============

@gimcana_router.get("/campaigns/{campaign_id}/qr-codes")
async def get_qr_codes(campaign_id: str, authorization: str = Header(None)):
    """Obtenir tots els QR codes d'una campanya"""
    user = await get_user_from_token(authorization)
    is_admin = user and user.get('role') == 'admin'
    
    qr_codes = await db.gimcana_qr_codes.find({"campaign_id": campaign_id}).sort("number", 1).to_list(100)
    
    result = []
    for qr in qr_codes:
        qr_data = {
            '_id': str(qr['_id']),
            'number': qr['number'],
            'establishment_name': qr.get('establishment_name', f"Punt {qr['number']}"),
            'location_hint': qr.get('location_hint', ''),
            'image_url': qr.get('image_url'),
        }
        
        # Només mostrar el codi secret als admins
        if is_admin:
            qr_data['code'] = qr['code']
            # Comptar quants usuaris han escanejat aquest QR
            scans = await db.gimcana_progress.count_documents({
                "campaign_id": campaign_id,
                f"scanned_codes.{qr['code']}": {"$exists": True}
            })
            qr_data['scan_count'] = scans
        
        result.append(qr_data)
    
    return result


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


# ============== SORTEIG ==============

@gimcana_router.post("/campaigns/{campaign_id}/execute-raffle")
async def execute_raffle(campaign_id: str, request: RaffleExecuteRequest, authorization: str = Header(None)):
    """
    Executar el sorteig d'una campanya (només admin)
    Selecciona guanyadors aleatoris entre els participants que han completat la gimcana
    """
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden executar sortejos")
    
    # Obtenir campanya
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    # Verificar que és una campanya de tipus sorteig
    if campaign.get('prize_type') != 'raffle':
        raise HTTPException(status_code=400, detail="Aquesta campanya no és de tipus sorteig")
    
    # Verificar que no s'ha executat ja
    if campaign.get('raffle_executed'):
        raise HTTPException(status_code=400, detail="El sorteig ja s'ha executat per aquesta campanya")
    
    # Obtenir participants elegibles (els que han completat i entrat al sorteig)
    participants = await db.gimcana_progress.find({
        "campaign_id": campaign_id,
        "completed": True,
        "entered_raffle": True
    }).to_list(10000)
    
    if len(participants) == 0:
        raise HTTPException(status_code=400, detail="No hi ha participants elegibles per al sorteig")
    
    num_winners = min(request.num_winners, len(participants))
    
    # Seleccionar guanyadors aleatoris
    winners = random.sample(participants, num_winners)
    
    # Preparar dades dels guanyadors
    winners_data = []
    for i, winner in enumerate(winners):
        winner_info = {
            "position": i + 1,
            "user_id": winner['user_id'],
            "user_name": winner.get('user_name', 'Usuari'),
            "user_email": winner.get('user_email', ''),
            "completed_at": winner.get('completed_at'),
            "entered_raffle_at": winner.get('entered_raffle_at')
        }
        winners_data.append(winner_info)
        
        # Afegir marcador de guanyador a l'usuari
        await db.users.update_one(
            {"_id": ObjectId(winner['user_id'])},
            {
                "$addToSet": {
                    "tags": f"gimcana_winner_{campaign_id}"
                }
            }
        )
        
        # Marcar el participant com a guanyador
        await db.gimcana_progress.update_one(
            {"_id": winner['_id']},
            {"$set": {
                "is_winner": True,
                "winner_position": i + 1,
                "won_at": datetime.utcnow()
            }}
        )
    
    # Marcar a tots els participants (guanyadors i no guanyadors)
    for p in participants:
        await db.users.update_one(
            {"_id": ObjectId(p['user_id'])},
            {
                "$addToSet": {
                    "tags": f"gimcana_participant_{campaign_id}"
                }
            }
        )
    
    # Actualitzar campanya amb el resultat del sorteig
    raffle_result = {
        "executed_at": datetime.utcnow(),
        "executed_by": str(user['_id']),
        "executed_by_name": user.get('name', 'Admin'),
        "total_participants": len(participants),
        "num_winners": num_winners,
        "winners": winners_data
    }
    
    await db.gimcana_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {
            "raffle_executed": True,
            "raffle_executed_at": datetime.utcnow(),
            "winners": winners_data,
            "raffle_result": raffle_result
        }}
    )
    
    # Guardar al registre de sortejos
    raffle_record = {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get('name'),
        **raffle_result,
        "created_at": datetime.utcnow()
    }
    await db.gimcana_raffles.insert_one(raffle_record)
    
    logger.info(f"Sorteig executat per campanya {campaign.get('name')}: {num_winners} guanyadors de {len(participants)} participants")
    
    return {
        "success": True,
        "message": f"Sorteig executat correctament! {num_winners} guanyador(s) seleccionat(s)",
        "total_participants": len(participants),
        "winners": winners_data
    }


@gimcana_router.get("/campaigns/{campaign_id}/raffle-result")
async def get_raffle_result(campaign_id: str, authorization: str = Header(None)):
    """Obtenir el resultat del sorteig d'una campanya"""
    user = await get_user_from_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Has d'iniciar sessió")
    
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    if not campaign.get('raffle_executed'):
        return {
            "raffle_executed": False,
            "message": "El sorteig encara no s'ha realitzat"
        }
    
    # Per usuaris normals, només mostrar guanyadors sense emails complets
    is_admin = user.get('role') == 'admin'
    user_id = str(user['_id'])
    
    winners = campaign.get('winners', [])
    
    # Verificar si l'usuari és guanyador
    is_winner = any(w.get('user_id') == user_id for w in winners)
    
    if not is_admin:
        # Ofuscar emails per no-admins
        for w in winners:
            email = w.get('user_email', '')
            if email and '@' in email:
                parts = email.split('@')
                w['user_email'] = f"{parts[0][:2]}***@{parts[1]}"
    
    return {
        "raffle_executed": True,
        "executed_at": campaign.get('raffle_executed_at'),
        "total_participants": campaign.get('raffle_result', {}).get('total_participants', 0),
        "winners": winners,
        "is_winner": is_winner,
        "campaign_name": campaign.get('name'),
        "prize_description": campaign.get('prize_description')
    }


@gimcana_router.get("/campaigns/{campaign_id}/export-raffle-pdf")
async def export_raffle_pdf(campaign_id: str, authorization: str = Header(None)):
    """
    Exportar el resultat del sorteig en format PDF (només admin)
    """
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden exportar el PDF")
    
    campaign = await db.gimcana_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    if not campaign.get('raffle_executed'):
        raise HTTPException(status_code=400, detail="El sorteig encara no s'ha realitzat")
    
    # Crear PDF
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Títol
        pdf.setFont("Helvetica-Bold", 20)
        pdf.drawCentredString(width/2, height - 2*cm, "ACTA DEL SORTEIG")
        
        pdf.setFont("Helvetica", 14)
        pdf.drawCentredString(width/2, height - 3*cm, campaign.get('name', ''))
        
        # Data del sorteig
        raffle_date = campaign.get('raffle_executed_at', datetime.utcnow())
        if isinstance(raffle_date, datetime):
            date_str = raffle_date.strftime("%d/%m/%Y a les %H:%M")
        else:
            date_str = str(raffle_date)
        
        pdf.setFont("Helvetica", 12)
        pdf.drawString(2*cm, height - 5*cm, f"Data del sorteig: {date_str}")
        
        # Estadístiques
        result = campaign.get('raffle_result', {})
        pdf.drawString(2*cm, height - 6*cm, f"Total participants: {result.get('total_participants', 0)}")
        pdf.drawString(2*cm, height - 6.5*cm, f"Nombre de guanyadors: {result.get('num_winners', 0)}")
        
        # Guanyadors
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(2*cm, height - 8*cm, "GUANYADORS:")
        
        pdf.setFont("Helvetica", 12)
        winners = campaign.get('winners', [])
        y_position = height - 9*cm
        
        for winner in winners:
            pdf.drawString(2.5*cm, y_position, f"{winner.get('position')}. {winner.get('user_name', 'Usuari')}")
            pdf.drawString(5*cm, y_position - 0.5*cm, f"   Email: {winner.get('user_email', '')}")
            y_position -= 1.5*cm
            
            if y_position < 4*cm:
                pdf.showPage()
                y_position = height - 2*cm
        
        # Signatura
        pdf.setFont("Helvetica", 10)
        pdf.drawString(2*cm, 3*cm, f"Executat per: {result.get('executed_by_name', 'Admin')}")
        pdf.drawString(2*cm, 2.5*cm, "El Tomb de Reus - Gimcana")
        
        pdf.save()
        buffer.seek(0)
        
        filename = f"sorteig_{campaign.get('name', 'gimcana').replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ImportError:
        raise HTTPException(status_code=500, detail="No es pot generar el PDF. Falta la llibreria reportlab.")


# ============== HISTORIAL DE SORTEJOS ==============

@gimcana_router.get("/raffles/history")
async def get_raffles_history(authorization: str = Header(None)):
    """Obtenir historial de tots els sortejos (només admin)"""
    user = await get_user_from_token(authorization)
    if not user or user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Només els administradors poden veure l'historial")
    
    raffles = await db.gimcana_raffles.find().sort("created_at", -1).to_list(100)
    
    for r in raffles:
        r['_id'] = str(r['_id'])
    
    return raffles