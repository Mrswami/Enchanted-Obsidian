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

@client.event
async def on_ready():
    print(f'// SOVEREIGN NODE ONLINE as {client.user}')

@client.event
async def on_message(message):
    global total_scrapes, total_scrape_duration
    if message.author == client.user:
        return

    if message.content.strip() == '/ping':
        await message.channel.send("// 🟢 **ENCHANTED NODE IS ONLINE**")
        return

    if message.content.strip() == '/stats':
        uptime = (time.time() - session_start_time) / 3600
        cost = ((uptime * 2.7 / 1000) + (total_scrape_duration / 3600 * 8 / 1000)) * 0.15
        await message.channel.send(f"// 📊 **TELEMETRY**\n> Uptime: `{uptime:.2f}h` | Ingestions: `{total_scrapes}` | Cost: `${cost:.4f}`")
        return

    if 'g.co/gemini/share/' in message.content or 'gemini.google.com/share/' in message.content:
        if INGESTION_LOCK.locked():
            await message.channel.send(f'// ⏳ **QUEUE BUSY** - Please wait...')

        async with INGESTION_LOCK:
            start_scrape = time.time()
            status_msg = await message.channel.send(f'// 👁️ **LINK DETECTED** by {message.author.mention}\n> `INITIATING SMART INGESTION PROTOCOL...`')
            
            try:
                url = message.content.strip()
                # Extract Stable ID from URL: e.g. g.co/gemini/share/abcdefg -> abcdefg
                link_id = url.split('/')[-1]
                
                await status_msg.edit(content=f'// ⚙️ **SCRAPING DATA...**')
                raw_html = await scrape_gemini_link(url)
                
                await status_msg.edit(content=f'// 🧹 **PARSING DIALOGUE...**')
                title, clean_markdown = parse_gemini_dialogue(raw_html)
                
                await status_msg.edit(content=f'// 🧠 **GENERATING RECALL PATTERNS...**')
                recall_slug = await generate_recall_slug(clean_markdown)
                
                # Check for existing note with this Stable ID
                filename = f"GEMINI_{recall_slug}_{link_id}.md"
                filepath = os.path.join(VAULT_DIR, filename)
                mode_status = "WRITING NEW"

                if os.path.exists(filepath):
                    mode_status = "UPDATING EXISTING"
                    # Future: Add check for manually added content here
                
                await status_msg.edit(content=f'// 💾 **{mode_status} TO VAULT...**')
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f"# {title}\n\n**Source**: {url}\n**Keywords**: {recall_slug.replace('-', ', ')}\n**Archive ID**: `{link_id}`\n\n---\n\n{clean_markdown}")
                
                total_scrapes += 1
                total_scrape_duration += (time.time() - start_scrape)
                await status_msg.edit(content=f'// ✅ **{mode_status} COMPLETE**\n> **RECALL SLUG**: `{recall_slug}`\n> **VAULT ANCHOR**: `[[{filename}]]`')
                
            except Exception as e:
                await status_msg.edit(content=f'// ❌ **FATAL ERROR**: {e}')

if __name__ == '__main__':
    _lock = ensure_single_instance()
    if not TOKEN:
        print("// ERROR: TOKEN MISSING")
    else:
        print(f"// VAULT: {VAULT_DIR}")
        client.run(TOKEN)
