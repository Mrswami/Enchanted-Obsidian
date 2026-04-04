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

    # Check if the message is a Gemini share link
    if 'g.co/gemini/share/' in message.content:
        await message.channel.send('// LINK DETECTED. INITIATING HIGH-FIDELITY EXTRACTION.')
        
        try:
            url = message.content.strip()
            raw_html = await scrape_gemini_link(url)
            
            title, clean_markdown = parse_gemini_dialogue(raw_html)
            
            timestamp = int(time.time())
            # Use title for filename but sanitize it
            safe_title = "".join(x for x in title if x.isalnum() or x in " -_").strip()
            filename = f"GEMINI_{safe_title}_{timestamp}.md"
            filepath = os.path.join(VAULT_DIR, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"# {title}\n\n")
                f.write(f"**Source URL**: {url}\n")
                f.write(f"**Ingested**: {time.ctime()}\n\n")
                f.write("---\n\n")
                f.write(clean_markdown)
                
            await message.channel.send(f'// EXTRACTION SECURED: [[{filename}]]')
            
        except Exception as e:
            await message.channel.send(f'// FATAL ERROR DURING INGESTION: {e}')

if __name__ == '__main__':
    if not TOKEN:
        print("// ERROR: DISCORD_BOT_TOKEN not found in environment.")
    else:
        client.run(TOKEN)
