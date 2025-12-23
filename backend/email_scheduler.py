"""
Sistema d'enviament programat d'emails de benvinguda
Per El Tomb de Reus

IMPORTANT: L'enviament està DESACTIVAT per defecte.
Per activar-lo, canvia EMAILS_AUTO_SEND_ENABLED = True
"""
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from email_service import send_welcome_email
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# CONFIGURACIÓ - CANVIA AIXÒ PER ACTIVAR
EMAILS_AUTO_SEND_ENABLED = False  # Canvia a True per activar l'enviament automàtic
EMAILS_BATCH_SIZE = 50            # Emails per lot
EMAILS_DELAY_SECONDS = 60         # Segons entre lots (1 minut)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'tomb_reus_db')


async def send_batch_welcome_emails():
    """
    Envia un lot d'emails de benvinguda als usuaris pendents.
    Retorna el nombre d'emails enviats.
    """
    if not EMAILS_AUTO_SEND_ENABLED:
        logger.info("📧 Enviament automàtic d'emails DESACTIVAT")
        return 0
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Buscar usuaris pendents
        users = await db.users.find({
            "must_change_password": True,
            "temp_password": {"$exists": True, "$ne": None, "$ne": ""},
            "welcome_email_sent": {"$ne": True}
        }).limit(EMAILS_BATCH_SIZE).to_list(EMAILS_BATCH_SIZE)
        
        if not users:
            logger.info("✅ No hi ha més usuaris pendents d'email de benvinguda")
            return 0
        
        emails_sent = 0
        emails_failed = 0
        
        for user in users:
            email = user.get("email")
            name = user.get("name", "")
            temp_password = user.get("temp_password")
            
            if not email or not temp_password:
                continue
            
            try:
                success = send_welcome_email(email, name, temp_password)
                if success:
                    emails_sent += 1
                    await db.users.update_one(
                        {"_id": user["_id"]},
                        {"$set": {
                            "welcome_email_sent": True, 
                            "welcome_email_sent_at": datetime.utcnow()
                        }}
                    )
                else:
                    emails_failed += 1
            except Exception as e:
                emails_failed += 1
                logger.error(f"Error enviant a {email}: {str(e)}")
        
        logger.info(f"📧 Lot enviat: {emails_sent} correctes, {emails_failed} errors")
        
        # Comprovar quants queden
        pending = await db.users.count_documents({
            "must_change_password": True,
            "temp_password": {"$exists": True, "$ne": None, "$ne": ""},
            "welcome_email_sent": {"$ne": True}
        })
        logger.info(f"📊 Usuaris pendents: {pending}")
        
        return emails_sent
        
    finally:
        client.close()


async def run_email_scheduler():
    """
    Executa l'enviament en lots fins que no quedin usuaris pendents.
    Espera EMAILS_DELAY_SECONDS entre cada lot.
    """
    if not EMAILS_AUTO_SEND_ENABLED:
        logger.info("📧 Scheduler d'emails desactivat. Per activar-lo, canvia EMAILS_AUTO_SEND_ENABLED = True")
        return
    
    logger.info("🚀 Iniciant enviament automàtic d'emails de benvinguda...")
    logger.info(f"   📦 Mida del lot: {EMAILS_BATCH_SIZE}")
    logger.info(f"   ⏱️ Retard entre lots: {EMAILS_DELAY_SECONDS} segons")
    
    total_sent = 0
    
    while True:
        sent = await send_batch_welcome_emails()
        total_sent += sent
        
        if sent == 0:
            break
        
        logger.info(f"   💤 Esperant {EMAILS_DELAY_SECONDS} segons abans del següent lot...")
        await asyncio.sleep(EMAILS_DELAY_SECONDS)
    
    logger.info(f"✅ Enviament completat! Total emails enviats: {total_sent}")


def start_email_scheduler():
    """Inicia el scheduler en un thread separat"""
    if not EMAILS_AUTO_SEND_ENABLED:
        logger.info("📧 Enviament automàtic d'emails DESACTIVAT")
        return
    
    import threading
    
    def run():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_email_scheduler())
    
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    logger.info("📧 Thread d'enviament d'emails iniciat")


# Per executar manualment:
# python email_scheduler.py
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("="*50)
    print("SISTEMA D'ENVIAMENT D'EMAILS DE BENVINGUDA")
    print("="*50)
    print(f"Activat: {EMAILS_AUTO_SEND_ENABLED}")
    print(f"Emails per lot: {EMAILS_BATCH_SIZE}")
    print(f"Retard entre lots: {EMAILS_DELAY_SECONDS} segons")
    print("="*50)
    
    if not EMAILS_AUTO_SEND_ENABLED:
        print("\n⚠️  L'enviament està DESACTIVAT.")
        print("Per activar-lo, edita email_scheduler.py i canvia:")
        print("   EMAILS_AUTO_SEND_ENABLED = True")
    else:
        print("\n🚀 Iniciant enviament...")
        asyncio.run(run_email_scheduler())
