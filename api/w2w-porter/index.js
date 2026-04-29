const { chromium } = require('playwright-chromium');
const { TableClient } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

module.exports = async function (context, myTimer) {
    const vaultName = process.env.KEY_VAULT_NAME;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    context.log("🐝 W2W-Porter: Starting headless sync for WhenToWork...");

    // 1. Fetch Credentials from Key Vault (or local env)
    let username, password;
    if (vaultName) {
        const url = `https://${vaultName}.vault.azure.net`;
        const credential = new DefaultAzureCredential();
        const client = new SecretClient(url, credential);
        
        try {
            username = (await client.getSecret("W2W-USERNAME")).value;
            password = (await client.getSecret("W2W-PASSWORD")).value;
            context.log("✅ Credentials retrieved from Key Vault.");
        } catch (err) {
            context.log.warn("Could not fetch secrets from Key Vault:", err.message);
        }
    }

    // Fallback to environment variables if Vault is not configured/accessible
    username = username || process.env.W2W_USERNAME;
    password = password || process.env.W2W_PASSWORD;

    if (!username || !password) {
        context.log.error("❌ W2W Credentials missing. Set KEY_VAULT_NAME or W2W_USERNAME/PASSWORD env vars.");
        return;
    }

    // 2. Playwright Scraper
    // Note: headless: true is required for Azure Functions
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        context.log("🐝 Logging into WhenToWork...");
        await page.goto('https://whentowork.com/logins.htm');
        
        // Use identified selectors
        await page.fill('input#username', username);
        await page.fill('input#password', password);
        await page.click('button.btn-primary:has-text("SIGN IN")');
        
        // Wait for navigation or a key element indicating success
        try {
            await page.waitForURL('**/main.htm*', { timeout: 15000 });
            context.log("✅ Login successful.");
        } catch (e) {
            context.log.error("❌ Login timed out or failed. Check credentials.");
            throw e;
        }

        // Navigate to Tradeboard to get available shifts/progress
        context.log("🐝 Fetching Mission Control Trade Board data...");
        await page.goto('https://whentowork.com/tradeboard.htm');
        await page.waitForSelector('.trade-item, .card, td', { timeout: 10000 });

        // Scrape shifts from the tradeboard
        const shifts = await page.evaluate(() => {
            const items = [];
            // This is a generic selector - we refine it based on W2W DOM
            document.querySelectorAll('.trade-item, .card, tr[id^="row"]').forEach(el => {
                const text = el.innerText.toLowerCase();
                const title = el.querySelector('strong, .name, .shift-title')?.innerText || "Work Shift";
                const timeMatch = el.innerText.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
                
                if (timeMatch) {
                    items.push({
                        title: title,
                        time: timeMatch[0],
                        status: text.includes('posted') || text.includes('drop') ? 'POSTED' : 'SWAP_PENDING',
                        isBirthday: text.includes('may 11') || text.includes('birthday'),
                        fullText: el.innerText.substring(0, 100)
                    });
                }
            });
            return items;
        });

        context.log(`🐝 Scraped ${shifts.length} shifts from Trade Board.`);

        // 3. Push to Table Storage ("Fast Lane")
        if (connectionString) {
            const tableClient = TableClient.fromConnectionString(connectionString, "Shifts");
            
            for (const shift of shifts) {
                // Determine progress based on status
                let progress = 20; // Default Assigned
                if (shift.status === 'POSTED') progress = 50;
                
                // Birthday & Priority Logic: 
                // Birthday: May 11th | Family Visit Weekend: May 16-17th
                const isBirthday = shift.isBirthday || (shift.time && shift.time.toLowerCase().includes('may 11'));
                const isPriorityWeekend = shift.time && (shift.time.toLowerCase().includes('may 16') || shift.time.toLowerCase().includes('may 17'));

                if (isBirthday || isPriorityWeekend) {
                    progress = Math.max(progress, 10); // Urgent if needs cover
                }

                const entity = {
                    partitionKey: "noless42",
                    rowKey: Buffer.from(`${shift.time}-${shift.title}`).toString('base64').substring(0, 80),
                    title: shift.title,
                    time: shift.time,
                    status: shift.status,
                    progress: progress,
                    isBirthday: shift.isBirthday || false,
                    lastSync: new Date().toISOString()
                };

                await tableClient.upsertEntity(entity, "Replace");
            }
            context.log("✅ Azure Table Storage updated with latest shifts.");
        }

    } catch (err) {
        context.log.error("❌ Scraper encountered an error:", err.message);
    } finally {
        await browser.close();
        context.log("🐝 W2W-Porter: Sync complete.");
    }
};
