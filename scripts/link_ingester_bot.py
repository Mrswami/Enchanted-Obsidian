import discord
import os
import time
import socket
import sys
import asyncio
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# Create a global lock to ensure tasks are processed sequentially
INGESTION_LOCK = asyncio.Lock()

def ensure_single_instance():
    """
    Ensures that only one instance of the bot is running on this machine
    by attempting to bind to a specific high-range local port (Ghost Range).
    """
    lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        # Using 50505 to avoid common application conflicts
        lock_socket.bind(("127.0.0.1", 50505))
        return lock_socket
    except socket.error:
        print("// ALREADY ONLINE: Existing bot instance detected. Terminating duplicate.")
        sys.exit(0)

load_dotenv()

# Environment variables we will set on the Pi
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
VAULT_DIR = os.getenv('ENCHANTED_VAULT_DIR', '/home/jacob/enchanted-vault/')

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

from bs4 import BeautifulSoup

async def scrape_gemini_link(url):
    """
    Spins up headless Chromium, renders the Gemini Share URL, 
    and extracts the underlying dialogue turns as clean text.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to the Gemini URL
        await page.goto(url)
        
        # Wait for the main conversational block to load
        # Gemini 2026 uses .content-container for the main dialogue feed
        try:
            await page.wait_for_selector('.content-container', timeout=15000)
        except:
            # Fallback for dynamic shells
            await page.wait_for_load_state('networkidle')
        
        raw_html = await page.content()
        await browser.close()
        return raw_html

def parse_gemini_dialogue(html):
    """
    Parses the raw HTML into a clean Markdown structured conversation.
    """
    soup = BeautifulSoup(html, 'html.parser')
    
    # Extract the conversation title if available
    title_tag = soup.select_one('h1')
    title = title_tag.get_text(strip=True) if title_tag else "Gemini Conversation"
    
    # Identify turns (User queries vs. Model responses)
    # Gemini uses .query-text for user prompts and .markdown for model responses
    prompts = soup.select('.query-text')
    responses = soup.select('.markdown')
    
    dialogue = []
    for i in range(max(len(prompts), len(responses))):
        if i < len(prompts):
            p_text = prompts[i].get_text(strip=True)
            dialogue.append(f"### 👤 USER\n{p_text}\n")
        
        if i < len(responses):
            # Model response is usually markdown rendered as HTML, 
            # for now we get clean text but we could potentially retain some formatting
            r_text = responses[i].get_text(strip=True)
            dialogue.append(f"### 🤖 GEMINI\n{r_text}\n")
            
    return title, "\n".join(dialogue)

@client.event
async def on_ready():
    print(f'// SOVEREIGN NODE ONLINE as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return

# 📊 SESSION TELEMETRY
session_start_time = time.time()
total_scrapes = 0
total_scrape_duration = 0.0

@client.event
async def on_message(message):
    global total_scrapes, total_scrape_duration
    
    if message.author == client.user:
        return

    # --- COMMAND: /stats ---
    if message.content.strip() == '/stats':
        uptime_hrs = (time.time() - session_start_time) / 3600
        # Estimation logic: Pi 5 draws ~2.7W idle, ~8W during Playwright scrape
        # We'll calculate total kWh based on uptime + active scrape time
        idle_kwh = (uptime_hrs * 2.7) / 1000
        active_kwh = (total_scrape_duration / 3600 * 8) / 1000
        total_kwh = idle_kwh + active_kwh
        cost = total_kwh * 0.15 # Assuming $0.15 per kWh
        
        await message.channel.send(
            f"// 📊 **ENCHANTED BRAIN TELEMETRY**\n"
            f"> **Uptime**: `{uptime_hrs:.2f} hrs`\n"
            f"> **Total Ingestions**: `{total_scrapes}`\n"
            f"> **Active Compute**: `{total_scrape_duration:.1f}s`\n"
            f"> **Est. Energy Used**: `{total_kwh:.6f} kWh`\n"
            f"> **Est. Session Cost**: `${cost:.6f} USD`"
        )
        return

    # Check if the message is a Gemini share link
    if 'g.co/gemini/share/' in message.content:
        if INGESTION_LOCK.locked():
            await message.channel.send(f'// ⏳ **QUEUE DETECTED** - Processing previous link for {message.author.mention}. Please wait...')

        async with INGESTION_LOCK:
            start_scrape = time.time()
            status_msg = await message.channel.send(f'// 👁️ **LINK DETECTED** by {message.author.mention}\n> `INITIATING SOVEREIGN INGESTION PROTOCOL...`')
            
            try:
                url = message.content.strip()
                await status_msg.edit(content=f'// 👁️ **LINK DETECTED** by {message.author.mention}\n> `⚙️ SCRAPING HTML DATA...`')
                raw_html = await scrape_gemini_link(url)
                
                await status_msg.edit(content=f'// 👁️ **LINK DETECTED** by {message.author.mention}\n> `🧹 PARSING DIALOGUE TURNS...`')
                title, clean_markdown = parse_gemini_dialogue(raw_html)
                
                await status_msg.edit(content=f'// 👁️ **LINK DETECTED** by {message.author.mention}\n> `💾 WRITING TO VAULT...`')
                
                timestamp = int(time.time())
                safe_title = "".join(x for x in title if x.isalnum() or x in " -_").strip()
                filename = f"GEMINI_{safe_title}_{timestamp}.md"
                filepath = os.path.join(VAULT_DIR, filename)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f"# {title}\n\n")
                    f.write(f"**Source URL**: {url}\n")
                    f.write(f"**Ingested**: {time.ctime()}\n\n")
                    f.write("---\n\n")
                    f.write(clean_markdown)
                
                # Update stats
                total_scrapes += 1
                total_scrape_duration += (time.time() - start_scrape)
                    
                await status_msg.edit(content=f'// ✅ **INGESTION COMPLETE** for {message.author.mention}\n> **TITLE**: `{title}`\n> **VAULT ANCHOR**: `[[{filename}]]`')
                
            except Exception as e:
                await status_msg.edit(content=f'// ❌ **FATAL ERROR DURING INGESTION** for {message.author.mention}\n> `ERROR`: {e}')

if __name__ == '__main__':
    # 🛡️ SINGLE INSTANCE LOCK
    # If another version of the bot is already running, this will terminate.
    _lock = ensure_single_instance()
    
    if not TOKEN:
        print("// ERROR: DISCORD_BOT_TOKEN not found in environment.")
    else:
        print(f"// INITIATING VAULT SYNC: {VAULT_DIR}")
        client.run(TOKEN)
