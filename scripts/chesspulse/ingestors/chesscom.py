from datetime import datetime, timezone
from typing import List, Dict

def fetch_chess_com_events() -> List[Dict]:
    """
    Since Chess.com lacks a 'Live List' API, we use a 'Predictive & Static' approach
    to ensure the user always sees the most important recurring events (like Titled Tuesday).
    """
    events = []
    now = datetime.now(timezone.utc)
    
    # 1. Titled Tuesday Logic (Every Tuesday)
    # Early: 4:00 PM UTC (11 AM ET)
    # Late: 10:00 PM UTC (5 PM ET)
    if now.strftime('%A') == 'Tuesday':
        events.append({
            "event_id": "com_tt_early",
            "title": "Titled Tuesday (Early Edition)",
            "platform": "Chess.com",
            "type": "Online / Blitz",
            "start_time": f"{now.strftime('%Y-%m-%d')}T16:00:00Z",
            "status": "LIVE" if 15 <= now.hour <= 18 else "Upcoming",
            "watch_links": ["https://www.chess.com/tv", "https://twitch.tv/chess"],
            "participants": ["Hikaru", "Magnus", "Alireza"],
            "hype_score": 95 if 15 <= now.hour <= 18 else 85
        })
        events.append({
            "event_id": "com_tt_late",
            "title": "Titled Tuesday (Late Edition)",
            "platform": "Chess.com",
            "type": "Online / Blitz",
            "start_time": f"{now.strftime('%Y-%m-%d')}T22:00:00Z",
            "status": "LIVE" if 21 <= now.hour <= 23 else "Upcoming",
            "watch_links": ["https://www.chess.com/tv", "https://twitch.tv/chess"],
            "participants": ["Hikaru", "Vidit", "Pragg"],
            "hype_score": 92 if 21 <= now.hour <= 23 else 82
        })

    # 2. General Event Hub (Always useful)
    events.append({
        "event_id": "com_general_events",
        "title": "Chess.com Global Events Hub",
        "platform": "Chess.com",
        "type": "Meta / All Events",
        "start_time": "",
        "status": "LIVE", # Always live with something
        "watch_links": ["https://www.chess.com/events"],
        "participants": [],
        "hype_score": 70
    })

    return events

if __name__ == "__main__":
    res = fetch_chess_com_events()
    print(f"Generated {len(res)} Chess.com events.")
    for r in res:
        print(f"[{r['hype_score']}%] {r['title']} ({r['status']})")
