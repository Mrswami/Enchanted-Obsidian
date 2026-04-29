import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict

def fetch_fide_major_events() -> List[Dict]:
    """
    Scrapes the official FIDE Major Events Calendar.
    Fulfills the 'Elite' and 'OTB' portion of the P.U.L.S.E. mission.
    """
    url = "https://calendar.fide.com/majorcalendar.php"
    events = []
    
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Selectors identified from browser analysis:
        # a[class^='event_status'] contains the tournament name.
        anchors = soup.select("a[class^='event_status']")
        
        current_year = str(datetime.now().year)
        
        for a in anchors:
            title = a.get_text(strip=True)
            if not title:
                continue
                
            # Metadata is usually in the next sibling (text node)
            metadata = ""
            sibling = a.next_sibling
            if sibling:
                metadata = sibling.get_text(strip=True)
            
            # Parsing: '08 Jan - 12 Jan / Monaco (MNC)'
            date_str = ""
            location = "Global"
            if '/' in metadata:
                parts = metadata.split('/')
                date_str = parts[0].strip()
                location = parts[1].strip()
            else:
                date_str = metadata.strip()

            # Assigning Hype Score based on FIDE status class
            # Status 1 is usually World Championship / Candidates
            status_class = a.get('class', [''])[0]
            hype_val = 80 # Default
            if 'event_status1' in status_class:
                hype_val = 98
            elif 'event_status2' in status_class:
                hype_val = 92

            events.append({
                "event_id": f"fide_otb_{hash(title)}",
                "title": title,
                "platform": "FIDE (OTB)",
                "type": "Elite OTB",
                "start_time": date_str,
                "status": "Official Calendar", 
                "watch_links": ["https://fide.com", "https://chess-results.com"],
                "participants": [location], # Using location as a placeholder for participant metadata
                "hype_score": hype_val
            })
            
        return events
    except Exception as e:
        print(f"Error scraping FIDE calendar: {e}")
        return []

if __name__ == "__main__":
    res = fetch_fide_major_events()
    print(f"Scraped {len(res)} major events from FIDE.")
    for r in res[:3]:
        print(f"[{r['hype_score']}%] {r['title']} - {r['start_time']} @ {r['participants'][0]}")
