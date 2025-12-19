#!/usr/bin/env python3
"""
Script per forçar l'actualització de notícies
"""
import asyncio
from news_scheduler import scheduled_news_update

async def main():
    print("🚀 Forçant actualització de notícies...")
    await scheduled_news_update()
    print("✅ Actualització completada!")

if __name__ == "__main__":
    asyncio.run(main())
