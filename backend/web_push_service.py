"""
Servei de Web Push Notifications per El Tomb de Reus
Permet enviar notificacions push als navegadors web
"""
import os
import json
import logging
from pywebpush import webpush, WebPushException
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuració VAPID
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.getenv('VAPID_CLAIMS_EMAIL', 'gestio@reusapp.com')


def send_web_push(subscription_info: dict, title: str, body: str, data: dict = None, icon: str = None) -> bool:
    """
    Envia una notificació web push a un navegador subscrit.
    
    Args:
        subscription_info: Objecte de subscripció del navegador
        title: Títol de la notificació
        body: Cos de la notificació
        data: Dades addicionals (opcional)
        icon: URL de la icona (opcional)
    
    Returns:
        True si s'ha enviat correctament, False en cas contrari
    """
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        logger.warning("Web Push no configurat: falten claus VAPID")
        return False
    
    try:
        # Preparar payload
        # Assegurar que data conté la URL de navegació
        notification_data = data.copy() if data else {}
        if 'url' not in notification_data:
            notification_data['url'] = '/notifications'  # URL per defecte
        
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png",
            "data": notification_data,
            "requireInteraction": False,
            "tag": "el-tomb-de-reus"
        }
        
        # Enviar notificació
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
        )
        
        logger.info(f"✅ Web Push enviat correctament")
        return True
        
    except WebPushException as e:
        logger.error(f"❌ Error enviant Web Push: {e}")
        # Si la subscripció ha expirat o és invàlida, retornem False
        if e.response and e.response.status_code in [404, 410]:
            logger.warning("Subscripció expirada o invàlida")
        return False
    except Exception as e:
        logger.error(f"❌ Error inesperat enviant Web Push: {e}")
        return False


def send_web_push_to_many(subscriptions: list, title: str, body: str, data: dict = None) -> dict:
    """
    Envia una notificació web push a múltiples subscriptors.
    
    Args:
        subscriptions: Llista de subscripcions
        title: Títol de la notificació
        body: Cos de la notificació
        data: Dades addicionals (opcional)
    
    Returns:
        Dict amb sent_count i failed_count
    """
    sent = 0
    failed = 0
    expired_subscriptions = []
    
    for sub in subscriptions:
        try:
            success = send_web_push(sub, title, body, data)
            if success:
                sent += 1
            else:
                failed += 1
                expired_subscriptions.append(sub.get('endpoint'))
        except Exception as e:
            failed += 1
            logger.error(f"Error: {e}")
    
    return {
        "sent_count": sent,
        "failed_count": failed,
        "expired_endpoints": expired_subscriptions
    }


def get_vapid_public_key() -> str:
    """Retorna la clau pública VAPID per al frontend"""
    return VAPID_PUBLIC_KEY
