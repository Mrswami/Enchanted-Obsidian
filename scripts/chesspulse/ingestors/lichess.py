import json
import requests
from typing import List, Dict

# Standardizing Lichess broadcast data into our Unified Event Schema
def fetch_lichess_broadcasts() -> List[Dict]:
    """
    Fetches the latest official broadcasts from Lichess.
    Returns a list of dictionaries following the ChessPulse schema.
    """
    url = "https://lichess.org/api/broadcast?limit=25"
    try:
        # Lichess/api/broadcast returns NDJSON
        response = requests.get(url, timeout=10, stream=True)
        response.raise_for_status()
        
        events = []
        tier_keywords = ['candidates', 'world championship', 'grand chess tour', 'masters', 'titled', 'grenke', 'festival']
        
        for line in response.iter_lines():
            if not line:
                continue
            
            b = json.loads(line)
            tourney = b.get('tour', {})
            title_raw = tourney.get('name', 'Untitled Lichess Event')
            title_lower = title_raw.lower()
            
            # Simple Hype Score logic (Status + Tier)
            rounds = b.get('rounds', [])
            is_live = any(not r.get('isFinished') for r in rounds)
            
            # Base Score
            hype_val = 40
            if is_live:
                hype_val += 35 # Status Boost
                
            # Tier Boost (Keyword based for now)
            if any(kw in title_lower for kw in tier_keywords):
                hype_val += 20 # Tier Boost
            
            # Final Cap at 100
            hype_val = min(hype_val, 100)
            
            events.append({
                "event_id": f"li_bc_{tourney.get('id', 'unknown')}",
                "title": title_raw,
                "platform": "Lichess",
                "type": "Online / OTB Broadcast",
                "start_time": "", 
                "status": "LIVE" if is_live else "Finished",
                "watch_links": [f"https://lichess.org/broadcast/-/-/{tourney.get('id')}"],
                "participants": [], 
                "hype_score": hype_val
            })
        
        # Sort by hype score descending
        events.sort(key=lambda x: x['hype_score'], reverse=True)
        return events
    except Exception as e:
        print(f"Error fetching Lichess broadcasts: {e}")
        return []

if __name__ == "__main__":
    # Quick test
    res = fetch_lichess_broadcasts()
    print(f"Fetched {len(res)} events from Lichess.")
    for r in res[:5]:
        print(f"[{r['hype_score']}%] {r['title']} ({r['status']})")
