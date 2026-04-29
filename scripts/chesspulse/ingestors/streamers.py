import requests
from bs4 import BeautifulSoup
from typing import List, Dict

def fetch_live_streamers() -> List[Dict]:
    """
    Scrapes Lichess streamers page to find active broadcasters.
    This provides 'Live Participant' metadata to boost Hype Scores.
    """
    url = "https://lichess.org/streamer"
    streamers = []
    
    try:
        # Use a real User-Agent to avoid simple bot detection
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Based on browser analysis of https://lichess.org/streamer
        # The cards for streamers are often identified by .streamer-card or inside .streamer-list
        cards = soup.select("a.streamer-card")
        
        for card in cards:
            # Check for the 'LIVE!' ribbon
            is_live = card.select_one(".live")
            if is_live:
                name_tag = card.select_one("span.name") or card.select_one("h2")
                name = name_tag.get_text(strip=True) if name_tag else "Unknown Streamer"
                
                # Title often follows the name or is in a specific div
                title_tag = card.select_one(".title") or card.select_one("p")
                title = title_tag.get_text(strip=True) if title_tag else ""
                
                streamers.append({
                    "name": name,
                    "title": title,
                    "platform": "Lichess",
                    "url": f"https://lichess.org{card.get('href')}"
                })
                
        return streamers
    except Exception as e:
        print(f"Error scraping streamers: {e}")
        return []

if __name__ == "__main__":
    active = fetch_live_streamers()
    print(f"Detected {len(active)} active streamers on Lichess.")
    for s in active[:5]:
        print(f"- {s['name']}: {s['title']} ({s['url']})")
