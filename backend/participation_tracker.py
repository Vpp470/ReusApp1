"""
Sistema de tracking de participacions d'usuaris amb marcadors
Permet filtrar usuaris per campanyes/promocions específiques
"""

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

class UserParticipation(BaseModel):
    """Model per guardar participacions d'usuaris"""
    user_id: str
    tag: str  # Marcador de la campanya/promoció
    activity_type: str  # 'promotion', 'ticket_scan', 'gift_card', 'offer'
    activity_id: str  # ID de la promoció/campanya/oferta
    activity_title: Optional[str] = None  # Títol per facilitar la cerca
    participated_at: datetime = datetime.utcnow()
    metadata: Optional[Dict] = {}  # Dades addicionals (ex: import, establiment, etc.)


async def track_participation(
    user_id: str,
    tag: str,
    activity_type: str,
    activity_id: str,
    activity_title: Optional[str] = None,
    metadata: Optional[Dict] = None
):
    """
    Registra una participació d'usuari en una activitat amb marcador
    
    Args:
        user_id: ID de l'usuari
        tag: Marc

ador/etiqueta de la campanya
        activity_type: Tipus d'activitat ('promotion', 'ticket_scan', 'gift_card', 'offer')
        activity_id: ID de l'activitat
        activity_title: Títol de l'activitat (opcional)
        metadata: Dades addicionals (opcional)
    """
    if not tag:
        # Si no hi ha marcador, no fem tracking
        return None
    
    participation = {
        "user_id": user_id,
        "tag": tag,
        "activity_type": activity_type,
        "activity_id": activity_id,
        "activity_title": activity_title,
        "participated_at": datetime.utcnow(),
        "metadata": metadata or {}
    }
    
    # Inserir participació
    result = await db.user_participations.insert_one(participation)
    return str(result.inserted_id)


async def get_users_by_tag(tag: str) -> List[Dict]:
    """
    Obté tots els usuaris que han participat en activitats amb un marcador específic
    
    Returns:
        List amb usuaris únics i el resum de les seves participacions
    """
    pipeline = [
        # Filtrar per tag
        {"$match": {"tag": tag}},
        
        # Agrupar per usuari
        {"$group": {
            "_id": "$user_id",
            "user_id": {"$first": "$user_id"},
            "total_participations": {"$sum": 1},
            "activities": {"$push": {
                "type": "$activity_type",
                "id": "$activity_id",
                "title": "$activity_title",
                "date": "$participated_at"
            }},
            "first_participation": {"$min": "$participated_at"},
            "last_participation": {"$max": "$participated_at"}
        }},
        
        # Ordenar per última participació
        {"$sort": {"last_participation": -1}}
    ]
    
    users = await db.user_participations.aggregate(pipeline).to_list(None)
    
    # Obtenir info addicional dels usuaris
    for user_data in users:
        user = await db.users.find_one({"_id": user_data["user_id"]})
        if user:
            user_data["name"] = user.get("name", "")
            user_data["email"] = user.get("email", "")
            user_data["phone"] = user.get("phone", "")
    
    return users


async def get_all_tags() -> List[Dict]:
    """
    Obté tots els marcadors disponibles amb estadístiques
    
    Returns:
        List amb marcadors i estadístiques d'ús
    """
    pipeline = [
        # Agrupar per tag
        {"$group": {
            "_id": "$tag",
            "tag": {"$first": "$tag"},
            "total_participations": {"$sum": 1},
            "unique_users": {"$addToSet": "$user_id"},
            "activities": {"$addToSet": "$activity_type"},
            "first_use": {"$min": "$participated_at"},
            "last_use": {"$max": "$participated_at"}
        }},
        
        # Afegir recompte d'usuaris únics
        {"$addFields": {
            "unique_users_count": {"$size": "$unique_users"}
        }},
        
        # Eliminar array d'usuaris (només volem el recompte)
        {"$project": {
            "unique_users": 0
        }},
        
        # Ordenar per última participació
        {"$sort": {"last_use": -1}}
    ]
    
    tags = await db.user_participations.aggregate(pipeline).to_list(None)
    return tags


async def get_user_tags(user_id: str) -> List[str]:
    """
    Obté tots els marcadors en què ha participat un usuari
    
    Returns:
        List de marcadors (tags)
    """
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$tag"}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.user_participations.aggregate(pipeline).to_list(None)
    return [item["_id"] for item in result if item["_id"]]


async def get_participation_stats(tag: Optional[str] = None) -> Dict:
    """
    Obté estadístiques de participacions
    
    Args:
        tag: Si s'especifica, estadístiques per aquest marcador. Sino, globals.
    
    Returns:
        Dict amb estadístiques
    """
    match_query = {"tag": tag} if tag else {}
    
    total_participations = await db.user_participations.count_documents(match_query)
    
    # Usuaris únics
    pipeline = [
        {"$match": match_query},
        {"$group": {"_id": "$user_id"}},
        {"$count": "unique_users"}
    ]
    unique_users_result = await db.user_participations.aggregate(pipeline).to_list(1)
    unique_users = unique_users_result[0]["unique_users"] if unique_users_result else 0
    
    # Activitats per tipus
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$activity_type",
            "count": {"$sum": 1}
        }}
    ]
    activities_by_type = await db.user_participations.aggregate(pipeline).to_list(None)
    
    return {
        "total_participations": total_participations,
        "unique_users": unique_users,
        "activities_by_type": {item["_id"]: item["count"] for item in activities_by_type},
        "tag": tag
    }
