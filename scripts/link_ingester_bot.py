import discord
import os
import time
import socket
import sys
import asyncio
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import google.generativeai as genai
import json
from datetime import datetime

load_dotenv()

# Environment variables we will set on the Pi
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
VAULT_DIR = os.getenv('ENCHANTED_VAULT_DIR', '/home/jacob/enchanted-vault/')
GEMINI_KEY = os.getenv('GEMINI_API_KEY')

# Create a global lock to ensure tasks are processed sequentially
INGESTION_LOCK = asyncio.Lock()

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)

def ensure_single_instance():
    """Ensures only one instance of the bot is running."""
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        lock_socket.bind(("127.0.0.1", 50505))
        return lock_socket
    except socket.error:
        print("// ALREADY ONLINE: Existing bot instance detected.")
        sys.exit(0)

# 📒 SOVEREIGN INGESTION MANIFEST (SIM)
MANIFEST_PATH = os.path.join(VAULT_DIR, "ingestion_manifest.json")

def load_manifest():
    if not os.path.exists(MANIFEST_PATH):
        return {}
    try:
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_manifest(manifest):
    try:
        with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
    except Exception as e:
        print(f"// MANIFEST SAVE ERROR: {e}")

def update_manifest(link_id, url, status, error=None, message_id=None):
    manifest = load_manifest()
    entry = manifest.get(link_id, {
        "url": url,
        "status": "PENDING",
        "timestamp": datetime.now().isoformat(),
        "error": None,
        "message_id": message_id,
        "retry_count": 0
    })
    
    if entry["status"] == "FAILED" and status == "PENDING":
        entry["retry_count"] += 1
        
    entry["status"] = status
    entry["error"] = str(error) if error else None
    manifest[link_id] = entry
    save_manifest(manifest)

async def generate_recall_slug(conversation_text):
    """Generates a tactical 5-word slug for cognitive recall."""
    if not GEMINI_KEY or not conversation_text:
        return "Recall-Note"
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Summarize this dialogue into 5 tactical keywords for instant recognition. Use hyphens. Output ONLY the slug:\n{conversation_text[:3000]}"
        response = model.generate_content(prompt)
        slug = response.text.strip().replace(" ", "-").replace('"', "").replace("'", "")
        return "".join(x for x in slug if x.isalnum() or x == "-")[:60]
    except Exception as e:
        print(f"// AI SLUG FAILED: {e}")
        return "Intel-Extract"

async def scrape_gemini_link(url):
    """Headless Chromium sweep of Gemini Share URL."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        try:
            await page.wait_for_selector('.content-container', timeout=15000)
        except:
            await page.wait_for_load_state('networkidle')
        raw_html = await page.content()
        await browser.close()
        return raw_html

def parse_gemini_dialogue(html):
    """Parses HTML into Markdown dialogue turns."""
    soup = BeautifulSoup(html, 'html.parser')
    title_tag = soup.select_one('h1')
    title = title_tag.get_text(strip=True) if title_tag else "Gemini Conversation"
    prompts = soup.select('.query-text')
    responses = soup.select('.markdown')
    dialogue = []
    for i in range(max(len(prompts), len(responses))):
        if i < len(prompts):
            dialogue.append(f"### 👤 USER\n{prompts[i].get_text(strip=True)}\n")
        if i < len(responses):
            dialogue.append(f"### 🤖 GEMINI\n{responses[i].get_text(strip=True)}\n")
    return title, "\n".join(dialogue)

# 📊 SESSION TELEMETRY
session_start_time = time.time()
total_scrapes = 0
total_scrape_duration = 0.0

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

async def trigger_shadow_recovery(client):
    """Manually triggers a scan of recent history to find missed links."""
    print(f'// INITIATING SHADOW RECOVERY (SIM)...')
    
    # 1. First, check the manifest for existing failures to retry
    manifest = load_manifest()
    failed_links = [k for k, v in manifest.items() if v["status"] != "COMPLETE"]
    if failed_links:
        print(f"// FOUND {len(failed_links)} UNFINISHED INGESTIONS. RE-TRYING...")

    # 2. Iterate through all text channels the bot can see for NEW links
    for guild in client.guilds:
        for channel in guild.text_channels:
            try:
                # Scanning deeper (100) for walk-recovery safety
                async for message in channel.history(limit=100):
                    if message.author == client.user:
                        continue
                    if 'g.co/gemini/share/' in message.content or 'gemini.google.com/share/' in message.content:
                        await process_message_logic(message, is_catchup=True)
            except Exception as e:
                print(f"// ERROR SWEEPING CHANNEL {channel.name}: {e}")
    
    print(f'// SHADOW RECOVERY COMPLETE.')

@client.event
async def on_ready():
    print(f'// SOVEREIGN NODE ONLINE as {client.user}')
    await trigger_shadow_recovery(client)

async def process_message_logic(message, is_catchup=False):
    global total_scrapes, total_scrape_duration
    
    if 'g.co/gemini/share/' in message.content or 'gemini.google.com/share/' in message.content:
        # Extract ID first to check for existence before taking the lock or sending status
        import re
        url_match = re.search(r'(https?://(g\.co/gemini/share/|gemini\.google\.com/share/)\S+)', message.content)
        if not url_match:
            return
            
        url = url_match.group(1)
        link_id = url.split('/')[-1]
        
        # Quick check for existing note to avoid redundant work during catch-up
        # Note: we don't know the slug yet, so we'll check by ID in filenames
        existing_files = [f for f in os.listdir(VAULT_DIR) if link_id in f]
        if existing_files:
            if is_catchup:
                return # Skip if already in vault during catch-up
        
        if INGESTION_LOCK.locked():
            if not is_catchup:
                await message.channel.send(f'// ⏳ **QUEUE BUSY** - Please wait...')

        async with INGESTION_LOCK:
            start_scrape = time.time()
            prefix = "[CATCH-UP]" if is_catchup else "[LIVE]"
            status_msg = await message.channel.send(f'// 👁️ **{prefix} LINK DETECTED** by {message.author.mention}\n> `INITIATING SMART INGESTION PROTOCOL...`')
            
            # Log to SIM as PENDING
            update_manifest(link_id, url, "PENDING", message_id=message.id)

            try:
                await status_msg.edit(content=f'// ⚙️ **SCRAPING DATA...**')
                raw_html = await scrape_gemini_link(url)
                
                await status_msg.edit(content=f'// 🧹 **PARSING DIALOGUE...**')
                title, clean_markdown = parse_gemini_dialogue(raw_html)
                
                await status_msg.edit(content=f'// 🧠 **GENERATING RECALL PATTERNS...**')
                recall_slug = await generate_recall_slug(clean_markdown)
                
                filename = f"GEMINI_{recall_slug}_{link_id}.md"
                filepath = os.path.join(VAULT_DIR, filename)
                mode_status = "WRITING NEW"

                if os.path.exists(filepath):
                    mode_status = "UPDATING EXISTING"
                
                await status_msg.edit(content=f'// 💾 **{mode_status} TO VAULT...**')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f"# {title}\n\n**Source**: {url}\n**Keywords**: {recall_slug.replace('-', ', ')}\n**Archive ID**: `{link_id}`\n\n---\n\n{clean_markdown}")
                
                # Mark as COMPLETE in SIM
                update_manifest(link_id, url, "COMPLETE")

                total_scrapes += 1
                total_scrape_duration += (time.time() - start_scrape)
                await status_msg.edit(content=f'// ✅ **{mode_status} COMPLETE**\n> **RECALL SLUG**: `{recall_slug}`\n> **VAULT ANCHOR**: `[[{filename}]]`')
                
            except Exception as e:
                update_manifest(link_id, url, "FAILED", error=e)
                await status_msg.edit(content=f'// ❌ **FATAL ERROR**: {e}')

@client.event
async def on_message(message):
    global total_scrapes, total_scrape_duration
    if message.author == client.user:
        return

    if message.content.strip() == '/ping':
        latency = round(client.latency * 1000)
        uptime_sec = time.time() - session_start_time
        uptime_str = f"{int(uptime_sec // 3600)}h {int((uptime_sec % 3600) // 60)}m"
        await message.channel.send(
            f"// 🟢 **ENCHANTED NODE IS ONLINE**\n"
            f"> Latency: `{latency}ms` | Uptime: `{uptime_str}`\n"
            f"> Status: `HEALTHY` | Mode: `Sovereign Ingestion`"
        )
        return

    if message.content.strip() == '/wake':
        await message.channel.send("// 👁️ **WAKING NODE...** Performing Shadow Recovery Scan.")
        await trigger_shadow_recovery(client)
        await message.channel.send("// ✅ **WAKE PROTOCOL COMPLETE.** All missed links ingested.")
        return

    if message.content.strip() == '/reboot':
        await message.channel.send("// ⚠️ **REBOOTING NODE...** Process terminating.")
        sys.exit(1) # Exit with error code to signal potential monitor restart if configured

    if message.content.strip() == '/stats':
        uptime = (time.time() - session_start_time) / 3600
        cost = ((uptime * 2.7 / 1000) + (total_scrape_duration / 3600 * 8 / 1000)) * 0.15
        await message.channel.send(f"// 📊 **TELEMETRY**\n> Uptime: `{uptime:.2f}h` | Ingestions: `{total_scrapes}` | Cost: `${cost:.4f}`")
        return

    await process_message_logic(message)

if __name__ == '__main__':
    _lock = ensure_single_instance()
    if not TOKEN:
        print("// ERROR: TOKEN MISSING")
    else:
        print(f"// VAULT: {VAULT_DIR}")
        client.run(TOKEN)
