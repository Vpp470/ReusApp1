import requests
import json
from typing import List, Optional

# URL de l'API d'Expo per enviar notificacions
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def send_push_notification(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None
) -> dict:
    """
    Enviar notificació push a través d'Expo
    
    Args:
        push_tokens: Llista de tokens Expo push
        title: Títol de la notificació
        body: Text de la notificació
        data: Dades addicionals (opcional)
    
    Returns:
        Resposta de l'API d'Expo
    """
    messages = []
    
    for token in push_tokens:
        if not token or not token.startswith('ExponentPushToken'):
            continue
            
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        messages.append(message)
    
    if not messages:
        return {"error": "No valid push tokens"}
    
    try:
        response = requests.post(
            EXPO_PUSH_URL,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            data=json.dumps(messages)
        )
        
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def send_notification_to_user(
    push_token: str,
    title: str,
    body: str,
    data: Optional[dict] = None
) -> dict:
    """
    Enviar notificació a un únic usuari
    """
    return send_push_notification([push_token], title, body, data)
