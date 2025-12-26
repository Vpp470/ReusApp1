"""
Routes per gestionar el contingut del Consell
"""
from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import os
import base64

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'tomb_reus_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

consell_router = APIRouter(prefix="/api/consell", tags=["consell"])

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def verify_consell_member(authorization: str):
    """Verificar que l'usuari és membre del consell o admin"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No autoritzat")
    
    user = await db.users.find_one({"token": authorization})
    if not user:
        raise HTTPException(status_code=401, detail="Token invàlid")
    
    if user.get("role") not in ["admin", "membre_consell"]:
        raise HTTPException(status_code=403, detail="No tens permisos per accedir a aquesta secció")
    
    return user

async def get_consell_members():
    """Obtenir tots els membres del consell"""
    members = await db.users.find({
        "role": {"$in": ["admin", "membre_consell"]}
    }).to_list(100)
    return [{
        "id": str(m["_id"]),
        "name": m.get("name", ""),
        "email": m.get("email", ""),
        "role": m.get("role", "")
    } for m in members]

# ============================================================================
# MODELS
# ============================================================================

class AgendaEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    date: str  # Format: YYYY-MM-DD
    time: Optional[str] = ""  # Format: HH:MM
    location: Optional[str] = ""
    attendees: Optional[List[str]] = []  # IDs dels membres

class AgendaEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None

class UrgentNoticeCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"  # normal, high, urgent

class CampanyaFuturaCreate(BaseModel):
    name: str
    description: str
    start_date: str
    end_date: str
    managers: List[str]  # IDs dels gestors

class EstatComptesCreate(BaseModel):
    title: str
    period: str  # Ex: "Gener 2025", "Q1 2025"
    comments: Optional[str] = ""
    file_data: Optional[str] = None  # Base64 encoded file
    file_name: Optional[str] = None
    file_type: Optional[str] = None  # pdf, xlsx

class CampanyaPublicitariaCreate(BaseModel):
    name: str
    start_date: str
    end_date: Optional[str] = None
    budget: float
    media: str  # Ex: "Ràdio Reus", "Diari de Tarragona"
    notes: Optional[str] = ""

class ActaConsellCreate(BaseModel):
    title: str
    meeting_date: str
    file_data: str  # Base64 encoded PDF
    file_name: str
    notes: Optional[str] = ""

# ============================================================================
# AGENDA ENDPOINTS
# ============================================================================

@consell_router.get("/agenda")
async def get_agenda_events(authorization: str = Header(None)):
    """Obtenir tots els esdeveniments de l'agenda"""
    await verify_consell_member(authorization)
    
    events = await db.consell_agenda.find().sort("date", -1).to_list(100)
    
    for event in events:
        event["_id"] = str(event["_id"])
        # Obtenir noms dels assistents
        if event.get("attendees"):
            attendee_names = []
            for aid in event["attendees"]:
                try:
                    user = await db.users.find_one({"_id": ObjectId(aid)})
                    if user:
                        attendee_names.append(user.get("name", user.get("email", "")))
                except:
                    pass
            event["attendee_names"] = attendee_names
    
    return events

@consell_router.get("/agenda/{event_id}")
async def get_agenda_event(event_id: str, authorization: str = Header(None)):
    """Obtenir un esdeveniment específic"""
    await verify_consell_member(authorization)
    
    event = await db.consell_agenda.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Esdeveniment no trobat")
    
    event["_id"] = str(event["_id"])
    return event

@consell_router.post("/agenda")
async def create_agenda_event(event: AgendaEventCreate, authorization: str = Header(None)):
    """Crear un nou esdeveniment a l'agenda"""
    user = await verify_consell_member(authorization)
    
    event_data = {
        **event.dict(),
        "created_by": str(user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.consell_agenda.insert_one(event_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.put("/agenda/{event_id}")
async def update_agenda_event(event_id: str, event: AgendaEventUpdate, authorization: str = Header(None)):
    """Actualitzar un esdeveniment"""
    await verify_consell_member(authorization)
    
    update_data = {k: v for k, v in event.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.consell_agenda.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Esdeveniment no trobat")
    
    return {"success": True}

@consell_router.delete("/agenda/{event_id}")
async def delete_agenda_event(event_id: str, authorization: str = Header(None)):
    """Eliminar un esdeveniment"""
    await verify_consell_member(authorization)
    
    result = await db.consell_agenda.delete_one({"_id": ObjectId(event_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Esdeveniment no trobat")
    
    return {"success": True}

@consell_router.post("/agenda/{event_id}/attend")
async def toggle_attendance(event_id: str, authorization: str = Header(None)):
    """Alternar assistència a un esdeveniment"""
    user = await verify_consell_member(authorization)
    user_id = str(user["_id"])
    
    event = await db.consell_agenda.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Esdeveniment no trobat")
    
    attendees = event.get("attendees", [])
    
    if user_id in attendees:
        attendees.remove(user_id)
        action = "removed"
    else:
        attendees.append(user_id)
        action = "added"
    
    await db.consell_agenda.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"attendees": attendees}}
    )
    
    return {"success": True, "action": action, "attendees": attendees}

@consell_router.get("/members")
async def get_members(authorization: str = Header(None)):
    """Obtenir llista de membres del consell"""
    await verify_consell_member(authorization)
    return await get_consell_members()

# ============================================================================
# ASSUMPTES SOBREVINGUTS ENDPOINTS
# ============================================================================

@consell_router.get("/assumptes")
async def get_urgent_notices(authorization: str = Header(None)):
    """Obtenir tots els assumptes sobrevinguts"""
    await verify_consell_member(authorization)
    
    notices = await db.consell_assumptes.find().sort("created_at", -1).to_list(100)
    
    for notice in notices:
        notice["_id"] = str(notice["_id"])
    
    return notices

@consell_router.post("/assumptes")
async def create_urgent_notice(notice: UrgentNoticeCreate, authorization: str = Header(None)):
    """Crear un nou assumpte sobrevingut"""
    user = await verify_consell_member(authorization)
    
    notice_data = {
        **notice.dict(),
        "created_by": str(user["_id"]),
        "created_by_name": user.get("name", user.get("email", "")),
        "created_at": datetime.utcnow()
    }
    
    result = await db.consell_assumptes.insert_one(notice_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.delete("/assumptes/{notice_id}")
async def delete_urgent_notice(notice_id: str, authorization: str = Header(None)):
    """Eliminar un assumpte"""
    await verify_consell_member(authorization)
    
    result = await db.consell_assumptes.delete_one({"_id": ObjectId(notice_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assumpte no trobat")
    
    return {"success": True}

# ============================================================================
# CAMPANYES FUTURES ENDPOINTS
# ============================================================================

@consell_router.get("/campanyes-futures")
async def get_future_campaigns(authorization: str = Header(None)):
    """Obtenir totes les campanyes futures"""
    await verify_consell_member(authorization)
    
    campaigns = await db.consell_campanyes_futures.find().sort("start_date", 1).to_list(100)
    
    for campaign in campaigns:
        campaign["_id"] = str(campaign["_id"])
        # Obtenir noms dels gestors
        if campaign.get("managers"):
            manager_names = []
            for mid in campaign["managers"]:
                try:
                    user = await db.users.find_one({"_id": ObjectId(mid)})
                    if user:
                        manager_names.append(user.get("name", user.get("email", "")))
                except:
                    pass
            campaign["manager_names"] = manager_names
    
    return campaigns

@consell_router.post("/campanyes-futures")
async def create_future_campaign(campaign: CampanyaFuturaCreate, authorization: str = Header(None)):
    """Crear una nova campanya futura"""
    user = await verify_consell_member(authorization)
    
    campaign_data = {
        **campaign.dict(),
        "created_by": str(user["_id"]),
        "created_at": datetime.utcnow(),
        "status": "planned"
    }
    
    result = await db.consell_campanyes_futures.insert_one(campaign_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.put("/campanyes-futures/{campaign_id}")
async def update_future_campaign(campaign_id: str, campaign: dict, authorization: str = Header(None)):
    """Actualitzar una campanya"""
    await verify_consell_member(authorization)
    
    campaign["updated_at"] = datetime.utcnow()
    
    result = await db.consell_campanyes_futures.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": campaign}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    return {"success": True}

@consell_router.delete("/campanyes-futures/{campaign_id}")
async def delete_future_campaign(campaign_id: str, authorization: str = Header(None)):
    """Eliminar una campanya"""
    await verify_consell_member(authorization)
    
    result = await db.consell_campanyes_futures.delete_one({"_id": ObjectId(campaign_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    return {"success": True}

# ============================================================================
# ESTAT DE COMPTES ENDPOINTS
# ============================================================================

@consell_router.get("/comptes")
async def get_accounts(authorization: str = Header(None)):
    """Obtenir tots els documents comptables"""
    await verify_consell_member(authorization)
    
    accounts = await db.consell_comptes.find().sort("created_at", -1).to_list(100)
    
    for account in accounts:
        account["_id"] = str(account["_id"])
        # No retornar les dades del fitxer complet per eficiència
        if "file_data" in account:
            account["has_file"] = True
            del account["file_data"]
    
    return accounts

@consell_router.get("/comptes/{account_id}/file")
async def get_account_file(account_id: str, authorization: str = Header(None)):
    """Obtenir el fitxer d'un document comptable"""
    await verify_consell_member(authorization)
    
    account = await db.consell_comptes.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise HTTPException(status_code=404, detail="Document no trobat")
    
    if not account.get("file_data"):
        raise HTTPException(status_code=404, detail="No hi ha fitxer adjunt")
    
    return {
        "file_data": account["file_data"],
        "file_name": account.get("file_name", "document"),
        "file_type": account.get("file_type", "pdf")
    }

@consell_router.post("/comptes")
async def create_account(account: EstatComptesCreate, authorization: str = Header(None)):
    """Crear un nou document comptable"""
    user = await verify_consell_member(authorization)
    
    account_data = {
        **account.dict(),
        "created_by": str(user["_id"]),
        "created_by_name": user.get("name", user.get("email", "")),
        "created_at": datetime.utcnow()
    }
    
    result = await db.consell_comptes.insert_one(account_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.delete("/comptes/{account_id}")
async def delete_account(account_id: str, authorization: str = Header(None)):
    """Eliminar un document comptable"""
    await verify_consell_member(authorization)
    
    result = await db.consell_comptes.delete_one({"_id": ObjectId(account_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document no trobat")
    
    return {"success": True}

# ============================================================================
# CAMPANYES PUBLICITÀRIES ENDPOINTS
# ============================================================================

@consell_router.get("/campanyes-publicitaries")
async def get_ad_campaigns(authorization: str = Header(None)):
    """Obtenir totes les campanyes publicitàries"""
    await verify_consell_member(authorization)
    
    campaigns = await db.consell_campanyes_publicitaries.find().sort("start_date", -1).to_list(100)
    
    for campaign in campaigns:
        campaign["_id"] = str(campaign["_id"])
    
    return campaigns

@consell_router.post("/campanyes-publicitaries")
async def create_ad_campaign(campaign: CampanyaPublicitariaCreate, authorization: str = Header(None)):
    """Crear una nova campanya publicitària"""
    user = await verify_consell_member(authorization)
    
    campaign_data = {
        **campaign.dict(),
        "created_by": str(user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.consell_campanyes_publicitaries.insert_one(campaign_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.put("/campanyes-publicitaries/{campaign_id}")
async def update_ad_campaign(campaign_id: str, campaign: dict, authorization: str = Header(None)):
    """Actualitzar una campanya publicitària"""
    await verify_consell_member(authorization)
    
    campaign["updated_at"] = datetime.utcnow()
    
    result = await db.consell_campanyes_publicitaries.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": campaign}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    return {"success": True}

@consell_router.delete("/campanyes-publicitaries/{campaign_id}")
async def delete_ad_campaign(campaign_id: str, authorization: str = Header(None)):
    """Eliminar una campanya publicitària"""
    await verify_consell_member(authorization)
    
    result = await db.consell_campanyes_publicitaries.delete_one({"_id": ObjectId(campaign_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campanya no trobada")
    
    return {"success": True}

# ============================================================================
# ACTES DEL CONSELL ENDPOINTS
# ============================================================================

@consell_router.get("/actes")
async def get_meeting_minutes(authorization: str = Header(None)):
    """Obtenir totes les actes del consell"""
    await verify_consell_member(authorization)
    
    minutes = await db.consell_actes.find().sort("meeting_date", -1).to_list(100)
    
    for minute in minutes:
        minute["_id"] = str(minute["_id"])
        # No retornar les dades del fitxer complet per eficiència
        if "file_data" in minute:
            minute["has_file"] = True
            del minute["file_data"]
    
    return minutes

@consell_router.get("/actes/{acta_id}/file")
async def get_acta_file(acta_id: str, authorization: str = Header(None)):
    """Obtenir el fitxer d'una acta"""
    await verify_consell_member(authorization)
    
    acta = await db.consell_actes.find_one({"_id": ObjectId(acta_id)})
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no trobada")
    
    if not acta.get("file_data"):
        raise HTTPException(status_code=404, detail="No hi ha fitxer adjunt")
    
    return {
        "file_data": acta["file_data"],
        "file_name": acta.get("file_name", "acta.pdf"),
    }

@consell_router.post("/actes")
async def create_meeting_minutes(acta: ActaConsellCreate, authorization: str = Header(None)):
    """Crear una nova acta"""
    user = await verify_consell_member(authorization)
    
    acta_data = {
        **acta.dict(),
        "created_by": str(user["_id"]),
        "created_by_name": user.get("name", user.get("email", "")),
        "created_at": datetime.utcnow()
    }
    
    result = await db.consell_actes.insert_one(acta_data)
    return {"success": True, "id": str(result.inserted_id)}

@consell_router.delete("/actes/{acta_id}")
async def delete_meeting_minutes(acta_id: str, authorization: str = Header(None)):
    """Eliminar una acta"""
    await verify_consell_member(authorization)
    
    result = await db.consell_actes.delete_one({"_id": ObjectId(acta_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Acta no trobada")
    
    return {"success": True}
