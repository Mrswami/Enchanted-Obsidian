import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

# Singleton for Firestore
_db = None

def get_db():
    global _db
    if _db is None:
        try:
            # When running on Google Cloud (Cloud Run), it automatically uses 
            # the platform's 'Default Application Credentials'.
            firebase_admin.initialize_app()
        except ValueError:
            # Already initialized
            pass
        _db = firestore.client()
    return _db

def get_cached_tournaments() -> Optional[List[Dict]]:
    """
    Returns tournament cache if it's less than 15 minutes old.
    """
    db = get_db()
    cache_ref = db.collection('cache').document('tournaments')
    doc = cache_ref.get()
    
    if doc.exists:
        data = doc.to_dict()
        timestamp = data.get('updated_at')
        if timestamp:
            # Checking if the cache is still 'fresh'
            now = datetime.now(timezone.utc)
            if now - timestamp < timedelta(minutes=15):
                return data.get('events')
    return None

def set_cached_tournaments(events: List[Dict]):
    """
    Updates the Firestore cache with the latest pulse data.
    """
    db = get_db()
    cache_ref = db.collection('cache').document('tournaments')
    cache_ref.set({
        'events': events,
        'updated_at': datetime.now(timezone.utc)
    })
