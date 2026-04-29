import os
import requests
import json
import socket
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class TEZCAT_Webhook:
    """
    Sovereign Webhook Bridge for TEZCAT // ENCHANTED OBSIDIAN.
    Connects local telemetry to YMCA Power Automate ecosystem.
    """
    
    def __init__(self):
        self.url = os.getenv('POWER_AUTOMATE_WEBHOOK_URL')
        self.node_id = socket.gethostname()
    def send_event(self, event_name, severity="INFO", details=""):
        """Sends a standardized JSON payload to the Power Automate endpoint."""
        if not self.url:
            print(f"// WEBHOOK SKIPPED: 'POWER_AUTOMATE_WEBHOOK_URL' not found in .env")
            return False

        payload = {
            "EventName": event_name,
            "Severity": severity,
            "Timestamp": datetime.now().isoformat(),
            "NodeID": self.node_id,
            "Details": details
        }

        try:
            response = requests.post(
                self.url, 
                json=payload, 
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if response.status_code in [200, 202]:
                print(f"// WEBHOOK DELIVERED: {event_name} ({severity})")
                return True
            else:
                print(f"// WEBHOOK ERROR: Received status {response.status_code}")
                return False
        except Exception as e:
            print(f"// WEBHOOK FATAL: {e}")
            return False

    def send_heartbeat(self):
        """Standardized heartbeat signal."""
        return self.send_event("HEARTBEAT", "INFO", "Node is active and monitoring channels.")

    def send_alert(self, message, critical=False):
        """Quick alert for specific system events."""
        severity = "CRITICAL" if critical else "WARN"
        return self.send_event("SYSTEM_ALERT", severity, message)

if __name__ == "__main__":
    # Manual Trigger Logic (The "Macro Button" simulator)
    bridge = TEZCAT_Webhook()
    print("--- TEZCAT WEBHOOK TEST ---")
    if not bridge.url:
        print("!! ALERT: POWER_AUTOMATE_WEBHOOK_URL is missing in .env")
        print("Follow instructions in scripts/PA_SETUP.md first.")
    else:
        success = bridge.send_event("MANUAL_TEST", "INFO", "Macro Button pressed manually.")
        if success:
            print("✅ TEST SUCCESSFUL: Check your Microsoft Teams.")
        else:
            print("❌ TEST FAILED: Check your internet connection or URL.")
