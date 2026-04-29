import requests
from bs4 import BeautifulSoup
from typing import List, Dict

def fetch_top_twitch_streamers() -> List[Dict]:
    """
    Scrapes TwitchMetrics for top live chess streamers. 
    Helps identify major global broadcasts without an official API key.
    """
    url = "https://www.twitchmetrics.net/channels/viewership/chess"
    streamers = []
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Selectors for TwitchMetrics top list:
        # Each channel is usually in a list item/div with a name link
        channel_links = soup.select("div.c-list-item h5 a")
        
        for link in channel_links:
            name = link.get_text(strip=True)
            # The title or metadata is often under the next sibling or in a .metadata class
            # but we can at least get the top names currently in the category.
            streamers.append({
                "name": name,
                "title": "", # Titles are harder to scrape from this overview
                "platform": "Twitch",
                "url": f"https://twitch.tv/{name}"
            })
            
        return streamers
    except Exception as e:
        print(f"Error scraping TwitchMetrics: {e}")
        return []

if __name__ == "__main__":
    top = fetch_top_twitch_streamers()
    print(f"Detected {len(top)} top chess streamers on Twitch via Metrics Scraper.")
    for t in top[:5]:
        print(f"- {t['name']} @ {t['url']}")
