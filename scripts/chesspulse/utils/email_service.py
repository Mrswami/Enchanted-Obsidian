import os
import resend
from jinja2 import Template
from datetime import datetime
from typing import List, Dict

# The 'Pulse Courier' Service
# Powered by Resend (Professional Email API)
class PulseCourier:
    def __init__(self, api_key: str = None):
        resend.api_key = api_key or os.environ.get("RESEND_API_KEY", "re_123456789")
        self.from_email = "ChessPulse <onboarding@resend.dev>" # Use your verified domain in production

    def generate_html_summary(self, top_events: List[Dict]) -> str:
        """Generates a Minimal Modern Rich HTML template for the Daily Pulse."""
        template_str = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f7f9; color: #1a1a1b; margin: 0; padding: 40px 0; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .header { background: #0a0a0c; color: #ffffff; padding: 40px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: 800; }
                .mission { font-size: 10px; color: #646cff; font-weight: 700; text-transform: uppercase; margin-top: 8px; letter-spacing: 2px; }
                .content { padding: 40px; }
                .event-card { border-bottom: 1px solid #f0f0f0; padding: 20px 0; margin-bottom: 20px; }
                .event-card:last-child { border-bottom: none; }
                .hype-tag { font-size: 10px; font-weight: 800; color: #ff4646; background: rgba(255, 70, 70, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
                .event-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #0a0a0c; }
                .event-meta { font-size: 12px; color: #999; margin-bottom: 16px; }
                .cta-button { display: inline-block; background: #646cff; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 8px; transition: background 0.2s; }
                .footer { text-align: center; padding: 40px; font-size: 11px; color: #999; background: #fafafa; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>♟️ CHESSPULSE</h1>
                    <div class="mission">Proactive Unified Live Streamlined Elite</div>
                </div>
                <div class="content">
                    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
                        Good morning! Here is your <strong>Daily Pulse</strong>—the most important chess maneuvers on the planet today.
                    </p>
                    
                    {% for event in events %}
                    <div class="event-card">
                        <div class="hype-tag">{{ event.hype_score }}% HYPE</div>
                        <div class="event-title">{{ event.title }}</div>
                        <div class="event-meta">{{ event.platform }} • {{ event.type }}</div>
                        <a href="{{ event.watch_links[0] }}" class="cta-button">WATCH LIVE</a>
                    </div>
                    {% endfor %}
                </div>
                <div class="footer">
                    &copy; 2026 ChessPulse Aggregator. All rights reserved.<br>
                    You are receiving this because you subscribed to the Global Chess Pipeline.
                </div>
            </div>
        </body>
        </html>
        """
        template = Template(template_str)
        return template.render(events=top_events)

    def send_pulse(self, to_emails: List[str], top_events: List[Dict]) -> bool:
        """Sends the HTML summary to all subscribers via Resend."""
        html_content = self.generate_html_summary(top_events)
        
        params: resend.Emails.SendParams = {
            "from": self.from_email,
            "to": to_emails,
            "subject": f"♟️ Your Daily Pulse | {datetime.now().strftime('%b %d, %Y')}",
            "html": html_content,
        }
        
        try:
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending Pulse Courier email: {e}")
            return False
