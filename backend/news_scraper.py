"""
Sistema de scraping i processament de notícies locals de Reus
Utilitza RSS feeds i scraping millorat per màxima fiabilitat
"""
import asyncio
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict
import os
from dotenv import load_dotenv
# from emergentintegrations.llm.chat import LlmChat, UserMessage
from openai import OpenAI
import feedparser

load_dotenv()

# RSS Feeds (més fiables que scraping)
RSS_FEEDS = {
    "diari_mes_reus": {
        "url": "https://www.diarimes.com/ca/rss/reus.xml",
        "name": "Diari Més - Reus",
        "rss": True
    },
    "diari_mes_camp": {
        "url": "https://www.diarimes.com/ca/rss/camp-tarragona.xml",
        "name": "Diari Més - Camp de Tarragona",
        "rss": True
    },
    "canal_reus": {
        "url": "https://canalreus.cat/feed/",
        "name": "Canal Reus",
        "rss": True  # SÍ té RSS feed!
    },
    "reusdigital": {
        "url": "https://www.reusdigital.cat/rss",
        "name": "Reus Digital",
        "rss": True
    }
}

# URL Agenda Municipal
AGENDA_MUNICIPAL_URL = "https://www.reus.cat/ajuntament/lajuntament-informa/agenda"


async def fetch_from_rss(feed_url: str, source_name: str) -> List[Dict]:
    """
    Obtenir notícies des d'un RSS feed
    """
    try:
        print(f"   📡 RSS {source_name}...")
        feed = feedparser.parse(feed_url)
        
        news_items = []
        for entry in feed.entries[:10]:  # Màxim 10 per font
            title = entry.get('title', '').strip()
            link = entry.get('link', '').strip()
            
            # Canal Reus sempre és de Reus, no cal filtrar pel títol
            if source_name == "Canal Reus":
                if title and link:
                    news_items.append({
                        'title': title,
                        'url': link,
                        'source': source_name
                    })
            # Per altres fonts, filtrar per "reus" al títol
            elif title and link and 'reus' in title.lower():
                news_items.append({
                    'title': title,
                    'url': link,
                    'source': source_name
                })
        
        print(f"      ✅ {len(news_items)} notícies trobades")
        return news_items
    
    except Exception as e:
        print(f"      ❌ Error RSS {source_name}: {str(e)}")
        return []


async def scrape_news_from_url(url: str, source_name: str) -> List[Dict]:
    """
    Scraping millorat de notícies d'una URL específica
    Busca en múltiples llocs i estructures HTML
    """
    try:
        print(f"   🔍 Scraping {source_name}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"      ❌ Error {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.content, 'html.parser')
        news_items = []
        
        # Estratègia 1: Buscar articles amb classes comunes
        selectors = [
            ('article', None),
            ('div', ['noticia', 'article', 'news-item', 'entry', 'post', 'item']),
            ('li', ['news-list-item', 'article-item']),
        ]
        
        for tag, classes in selectors:
            if classes:
                for cls in classes:
                    articles = soup.find_all(tag, class_=lambda x: x and cls in x if x else False)
                    if articles:
                        break
            else:
                articles = soup.find_all(tag)
            
            if articles and len(articles) > 2:
                break
        
        # Estratègia 2: Si no troba articles, buscar tots els enllaços amb títols
        if not articles or len(articles) < 3:
            articles = soup.find_all('a', href=True)
        
        for article in articles[:15]:  # Limitar a 15 per font
            try:
                # Buscar títol
                title_elem = article.find(['h1', 'h2', 'h3', 'h4', 'span', 'strong'])
                if not title_elem:
                    title_elem = article
                
                title = title_elem.get_text(strip=True)
                
                # Buscar enllaç
                if article.name == 'a':
                    link = article.get('href', '')
                else:
                    link_elem = article.find('a', href=True)
                    link = link_elem['href'] if link_elem else ''
                
                # Filtrar notícies vàlides
                if title and link and len(title) > 20 and len(title) < 200:
                    # Assegurar URL absoluta
                    if not link.startswith('http'):
                        from urllib.parse import urljoin
                        link = urljoin(url, link)
                    
                    # Filtrar per "reus" al títol o URL
                    if 'reus' in title.lower() or 'reus' in link.lower():
                        news_items.append({
                            'title': title,
                            'url': link,
                            'source': source_name
                        })
            except:
                continue
        
        # Eliminar duplicats per URL
        seen_urls = set()
        unique_news = []
        for item in news_items:
            if item['url'] not in seen_urls:
                seen_urls.add(item['url'])
                unique_news.append(item)
        
        print(f"      ✅ {len(unique_news)} notícies trobades")
        return unique_news[:10]  # Màxim 10
    
    except Exception as e:
        print(f"      ❌ Error: {str(e)}")
        return []


async def process_news_with_ai(raw_news: List[Dict], max_news: int = 6) -> List[Dict]:
    """
    Processar notícies amb IA per filtrar i resumir les més rellevants
    Si no hi ha clau d'API o falla, retorna les primeres notícies
    """
    try:
        api_key = os.getenv('EMERGENT_LLM_KEY') or os.getenv('OPENAI_API_KEY')
        
        # Si no hi ha clau, retornar notícies sense processar
        if not api_key:
            print("   ⚠️ Sense clau d'IA - usant selecció automàtica sense IA")
            # Prioritzar notícies de Canal Reus i Reus Digital (més locals)
            priority_sources = ["Canal Reus", "Reus Digital"]
            priority_news = [n for n in raw_news if n.get('source') in priority_sources]
            other_news = [n for n in raw_news if n.get('source') not in priority_sources]
            return (priority_news + other_news)[:max_news]
        
        # Preparar prompt per a la IA
        news_text = "\n\n".join([
            f"{i+1}. {item['title']} (Font: {item['source']})\n   URL: {item['url']}"
            for i, item in enumerate(raw_news)
        ])
        
        prompt = f"""Ets un editor de notícies local de Reus. Tens aquesta llista de notícies:

{news_text}

TASCA:
1. Selecciona les {max_news} notícies MÉS RELLEVANTS sobre Reus, el seu comerç local, esdeveniments o cultura
2. Descarta notícies no relacionades amb Reus o poc interessants
3. Retorna NOMÉS els números de les notícies seleccionades separats per comes (exemple: 1,3,5,7)

RESPOSTA (NOMÉS NÚMEROS):"""

        # Cridar la IA amb OpenAI directament
        client = OpenAI(api_key=api_key)
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ets un editor de notícies local expert en seleccionar contingut rellevant."},
                {"role": "user", "content": prompt}
            ]
        )
        
        response = completion.choices[0].message.content
        
        # Extreure números seleccionats
        selected_indices = [int(n.strip())-1 for n in response.split(',') if n.strip().isdigit()]
        
        # Filtrar notícies seleccionades
        selected_news = [raw_news[i] for i in selected_indices if i < len(raw_news)]
        
        return selected_news[:max_news]
    
    except Exception as e:
        print(f"❌ Error processant amb IA: {str(e)}")
        # Fallback: retornar les primeres notícies
        return raw_news[:max_news]


async def fetch_daily_news(max_news: int = 6) -> List[Dict]:
    """
    Obtenir notícies diàries de totes les fonts
    Utilitza RSS primer, després scraping com a fallback
    """
    print(f"\n🔍 Cercant notícies de Reus... ({datetime.now().strftime('%H:%M')})")
    
    all_news = []
    
    # 1. Intentar RSS feeds primer (més fiable)
    print(f"   📡 Provant RSS feeds...")
    for key, feed_info in RSS_FEEDS.items():
        if feed_info.get('rss'):
            news = await fetch_from_rss(feed_info['url'], feed_info['name'])
            all_news.extend(news)
            await asyncio.sleep(1)
    
    # 2. Si RSS no ha donat resultats, provar scraping
    if len(all_news) < 3:
        print(f"   🔍 Provant scraping directe...")
        for key, feed_info in RSS_FEEDS.items():
            if not feed_info.get('rss'):  # Només scraping per fonts sense RSS
                news = await scrape_news_from_url(feed_info['url'], feed_info['name'])
                all_news.extend(news)
                await asyncio.sleep(1)
    
    print(f"   ✅ Total notícies trobades: {len(all_news)}")
    
    # Invertir l'ordre per tenir les més recents primer
    all_news = list(reversed(all_news))
    
    # 3. Processar amb IA per seleccionar les més rellevants
    if all_news:
        print(f"   🤖 Processant amb IA...")
        try:
            selected_news = await process_news_with_ai(all_news, max_news)
            print(f"   ✅ Seleccionades: {len(selected_news)} notícies\n")
            return selected_news
        except Exception as e:
            print(f"   ⚠️  IA no disponible, retornant notícies sense filtrar")
            # Retornar les més recents quan la IA falla
            return all_news[:max_news]
    
    return []


# Test del scraper
if __name__ == "__main__":
    async def test():
        news = await fetch_daily_news(6)
        for i, item in enumerate(news, 1):
            print(f"{i}. {item['title']}")
            print(f"   Font: {item['source']}")
            print(f"   URL: {item['url']}\n")
    
    asyncio.run(test())
