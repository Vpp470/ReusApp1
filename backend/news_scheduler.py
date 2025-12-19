"""
Sistema de tasques programades per actualització automàtica de notícies
Execució: 8:00, 14:00 i 20:00 cada dia
"""
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# Connexió a MongoDB
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'tomb_reus_db')

async def clean_expired_news():
    """Eliminar notícies caducades"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Eliminar notícies amb expiry_date passat
        result = await db.news.delete_many({
            "expiry_date": {"$exists": True, "$ne": None, "$lt": datetime.utcnow()}
        })
        
        if result.deleted_count > 0:
            print(f"   🗑️  Eliminades {result.deleted_count} notícies caducades")
        
        client.close()
    except Exception as e:
        print(f"   ❌ Error eliminant notícies caducades: {str(e)}")

async def scheduled_news_update():
    """Tasca programada per actualitzar notícies"""
    try:
        print(f"\n📰 Actualització automàtica de notícies - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        
        # Primer, netejar notícies caducades
        await clean_expired_news()
        
        from news_scraper import fetch_daily_news
        
        # Obtenir notícies
        news_items = await fetch_daily_news(max_news=6)
        
        if not news_items:
            print("   ⚠️  No s'han trobat notícies")
            return
        
        # Connectar a la base de dades
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Guardar notícies
        inserted_count = 0
        skipped_count = 0
        
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
                print(f"   ✅ {item['title'][:60]}... ({item['source']})")
            else:
                skipped_count += 1
        
        print(f"   📊 Resum: {inserted_count} noves, {skipped_count} duplicades\n")
        
        client.close()
        
    except Exception as e:
        print(f"   ❌ Error en l'actualització automàtica: {str(e)}\n")

def start_news_scheduler():
    """Iniciar el scheduler de notícies"""
    import logging
    logger = logging.getLogger(__name__)
    
    scheduler = AsyncIOScheduler()
    
    # Programar tasques a les 8:00, 14:00 i 20:00
    scheduler.add_job(
        scheduled_news_update,
        CronTrigger(hour=8, minute=0),
        id='news_morning',
        name='Notícies matí (8:00)',
        replace_existing=True
    )
    
    scheduler.add_job(
        scheduled_news_update,
        CronTrigger(hour=14, minute=0),
        id='news_afternoon',
        name='Notícies migdia (14:00)',
        replace_existing=True
    )
    
    scheduler.add_job(
        scheduled_news_update,
        CronTrigger(hour=20, minute=0),
        id='news_evening',
        name='Notícies vespre (20:00)',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler de notícies iniciat correctament")
    logger.info("Actualitzacions programades: 8:00, 14:00, 20:00")
    
    # Executar una actualització inicial en segon pla (després de 30 segons)
    import threading
    def delayed_initial_update():
        import time
        time.sleep(30)  # Esperar 30 segons perquè el servidor arrenqui
        asyncio.run(scheduled_news_update())
    
    thread = threading.Thread(target=delayed_initial_update, daemon=True)
    thread.start()
    logger.info("Actualització inicial de notícies programada per dins de 30 segons")
    
    return scheduler

# Per executar manualment
if __name__ == "__main__":
    async def test():
        await scheduled_news_update()
    
    asyncio.run(test())
