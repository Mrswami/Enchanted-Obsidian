import discord
import os
import time
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv()

# Environment variables we will set on the Pi
TOKEN = os.getenv('DISCORD_BOT_TOKEN')
VAULT_DIR = os.getenv('ENCHANTED_VAULT_DIR', '/home/jacob/enchanted-vault/')

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

async def scrape_gemini_link(url):
    """
    Spins up headless Chromium, renders the Gemini Share URL, 
    and extracts the underlying dialogue.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to the Gemini URL
        await page.goto(url)
        
        # Wait for the main conversational block to load
        # (Selectors will need final tuning based on live render tests)
        await page.wait_for_selector('message-content', timeout=10000)
        
        content = await page.content()
        await browser.close()
        return content

@client.event
async def on_ready():
    print(f'// SOVEREIGN NODE ONLINE as {client.user}')

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    # Check if the message is a Gemini share link
    if 'g.co/gemini/share/' in message.content:
        await message.channel.send('// LINK DETECTED. INITIATING PLAYWRIGHT SCRAPER.')
        
        try:
            url = message.content.strip()
            raw_html = await scrape_gemini_link(url)
            
            # TODO: Add BeautifulSoup parsing here to extract pure markdown
            # For phase 1, we acknowledge receipt and prep the file anchor
            
            timestamp = int(time.time())
            filename = f"EXTRACT_{timestamp}.md"
            filepath = os.path.join(VAULT_DIR, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"# Extracted Link: {url}\n\n")
                f.write("> // Awaiting HTML sanitization block\n")
                
            await message.channel.send(f'// EXTRACTION SECURED: [[{filename}]]')
            
        except Exception as e:
            await message.channel.send(f'// FATAL ERROR DURING INGESTION: {e}')

if __name__ == '__main__':
    if not TOKEN:
        print("// ERROR: DISCORD_BOT_TOKEN not found in environment.")
    else:
        client.run(TOKEN)
