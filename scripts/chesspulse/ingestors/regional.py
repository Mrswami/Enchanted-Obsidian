import requests
from bs4 import BeautifulSoup
from googletrans import Translator
from typing import List, Dict

# The 'Regional Heartbeat' Ingestor
# Bridges the language gap for 'Cross-Pollination' and 'Teachable Moments'
class RegionalBridge:
    def __init__(self):
        self.translator = Translator()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
        }

    def fetch_regional_highlights(self, lang_code: str = 'uk', lang_name: str = 'Ukrainian') -> List[Dict]:
        """Scrapes regional Lichess streamers and translates their insights."""
        url = f"https://lichess.org/streamer?lang={lang_code}"
        highlights = []
        
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Use card-based identification from browser analysis
            cards = soup.select("a.streamer-card")
            
            for card in cards:
                is_live = card.select_one(".live")
                if is_live:
                    name_tag = card.select_one("span.name") or card.select_one("h2")
                    raw_name = name_tag.get_text(strip=True) if name_tag else "Regional Talent"
                    
                    title_tag = card.select_one(".title") or card.select_one("p")
                    raw_title = title_tag.get_text(strip=True) if title_tag else ""
                    
                    # 🤖 The HEAVY LIFTING: Translate regional titles to English
                    translated_title = raw_title
                    if raw_title:
                        try:
                            # Using googletrans to bridge the gap
                            translated = self.translator.translate(raw_title, dest='en')
                            translated_title = translated.text
                        except Exception as te:
                            print(f"Translation skip: {te}")

                    highlights.append({
                        "event_id": f"regional_{lang_code}_{hash(raw_name)}",
                        "title": f"[{lang_name}] {translated_title}",
                        "platform": f"Regional Pulse ({raw_name})",
                        "type": "Global Insight / Teachable Moment",
                        "start_time": "LIVE NOW",
                        "status": "LIVE",
                        "watch_links": [f"https://lichess.org{card.get('href')}"],
                        "participants": [raw_name, f"Source Lang: {lang_name}"],
                        "hype_score": 85, # Regional stars are always high-hype for cross-pollination
                        "original_title": raw_title
                    })
                    
            return highlights
        except Exception as e:
            print(f"Error bridging regional gap ({lang_code}): {e}")
            return []

if __name__ == "__main__":
    bridge = RegionalBridge()
    # Test Ukrainian bridge (user's regional request)
     uk_insights = bridge.fetch_regional_highlights('uk', 'Ukrainian')
     print(f"Pulsed {len(uk_insights)} translated Ukrainian insights.")
     for uk in uk_insights[:2]:
        print(f">> {uk['title']} (Orig: {uk['original_title']})")
