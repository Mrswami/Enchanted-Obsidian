from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import requests
import firebase_admin
from firebase_admin import firestore
from ingestors.lichess import fetch_lichess_broadcasts
from ingestors.chesscom import fetch_chess_com_events
from ingestors.fide import fetch_fide_major_events
from ingestors.streamers import fetch_live_streamers as fetch_lichess_streamers
from ingestors.twitch import fetch_top_twitch_streamers
from ingestors.regional import RegionalBridge
from utils.normalization import deduplicate_events, boost_hype_from_streamers
from utils.cache import get_cached_tournaments, set_cached_tournaments
from utils.email_service import PulseCourier

# Initialize Firebase (handles Default Credentials in Cloud Run)
try:
    firebase_admin.initialize_app()
except ValueError:
    pass

app = FastAPI(
    title="ChessPulse API",
    description="The Global Chess Tournament Aggregator",
    version="0.4.0", # Version with Regional Bridge Support
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChessEvent(BaseModel):
    event_id: str
    title: str
    platform: str
    type: str
    start_time: str
    status: str
    watch_links: List[str]
    participants: List[str]
    hype_score: Optional[int] = 0

class Subscriber(BaseModel):
    email: EmailStr

@app.get("/")
def read_root():
    return {"message": "Welcome to ChessPulse API. Global Bridge is active."}

@app.get("/tournaments", response_model=List[ChessEvent])
def get_tournaments():
    # 1. CHECK CACHE
    cached_data = get_cached_tournaments()
    if cached_data:
        return cached_data

    # 2. FETCH CORE DATA
    all_raw_events = (
        fetch_lichess_broadcasts() + 
        fetch_chess_com_events() + 
        fetch_fide_major_events()
    )
    
    # 3. GLOBAL BRIDGE (Regional Ingestors)
    # Fulfills 'transcending language barriers' and 'cross-pollination' with ChessXL
    bridge = RegionalBridge()
    # Pulling Ukrainian (user's specific request) and Spanish (High global volume)
    regional_pulse = bridge.fetch_regional_highlights('uk', 'Ukrainian') + bridge.fetch_regional_highlights('es', 'Spanish')
    
    # 4. NORMALIZE
    unified_events = deduplicate_events(all_raw_events + regional_pulse)
    
    # 5. STREAMER PULSE (Live boosting)
    streamers = fetch_lichess_streamers() + fetch_top_twitch_streamers()
    boosted_events = boost_hype_from_streamers(unified_events, streamers)
    
    # 6. SORT & CACHE
    boosted_events.sort(key=lambda x: x['hype_score'], reverse=True)
    set_cached_tournaments(boosted_events)
    
    return boosted_events

# --- PULSE COURIER ENDPOINTS ---

@app.post("/subscribe")
def subscribe(subscriber: Subscriber):
    """Saves a user address to the 'subscribers' collection in Firestore."""
    db = firestore.client()
    sub_ref = db.collection('subscribers').document(subscriber.email)
    
    if sub_ref.get().exists:
        return {"status": "already_subscribed", "message": "Email is already on the pulse pipeline."}
    
    sub_ref.set({
        "email": subscriber.email,
        "created_at": firestore.SERVER_TIMESTAMP
    })
    return {"status": "success", "message": "Pulse delivery confirmed."}

@app.post("/admin/send-pulse")
def admin_send_pulse():
    """Manual trigger for the 'Daily Pulse' email summary."""
    tournaments = get_tournaments()
    # Filter for the most important 'Elite' or 'Regional Bridge' highlights
    top_5 = tournaments[:5]
    
    db = firestore.client()
    subs = db.collection('subscribers').stream()
    emails = [s.get('email') for s in subs]
    
    if not emails:
        return {"status": "no_subscribers"}

    courier = PulseCourier()
    success = courier.send_pulse(emails, top_5)
    return {"status": "success" if success else "error"}
