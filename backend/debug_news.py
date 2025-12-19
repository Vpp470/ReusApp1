#!/usr/bin/env python3
"""
Debug news update to see what's happening
"""
import asyncio
from news_scraper import fetch_daily_news
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("🔍 Debugging news update...")
    
    # Get news
    news_items = await fetch_daily_news(max_news=10)
    
    print(f"\n📋 Found {len(news_items)} news items:")
    for i, item in enumerate(news_items, 1):
        print(f"\n{i}. {item['title']}")
        print(f"   URL: {item['url']}")
        print(f"   Source: {item['source']}")
    
    # Check database
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    
    print(f"\n🔍 Checking which ones are duplicates...")
    for i, item in enumerate(news_items, 1):
        existing = await db.news.find_one({"url": item['url']})
        if existing:
            print(f"❌ {i}. DUPLICATE: {item['title'][:50]}...")
        else:
            print(f"✅ {i}. NEW: {item['title'][:50]}...")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
