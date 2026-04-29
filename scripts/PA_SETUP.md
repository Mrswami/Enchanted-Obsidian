# 🛰️ Power Automate Setup: TEZCAT Webhook Bridge

Follow these instructions during **Sprint 1** to establish the "Push Logic" connection between your local node and the YMCA staff environment.

## 🛠️ Step 1: Create the Cloud Flow
1. Log in to [make.powerautomate.com](https://make.powerautomate.com) using your YMCA credentials.
2. Select **Create** > **Instant cloud flow**.
3. Skip the "Choose how to trigger" dialog and click **Create** on the blank canvas.
4. Search for the trigger: **"When an HTTP request is received"**.

## 📄 Step 2: Configure the JSON Schema
In the trigger configuration, click **"Use sample payload to generate schema"** and paste the following:

```json
{
  "EventName": "NODE_ONLINE",
  "Severity": "INFO",
  "Timestamp": "2024-04-12T00:00:00Z",
  "NodeID": "ENCHANTED_VAULT_01",
  "Details": "Sovereign Ingestion Node is active."
}
```

*Alternatively, paste this into the "Request Body JSON Schema" field directly:*

```json
{
  "type": "object",
  "properties": {
    "EventName": { "type": "string" },
    "Severity": { "type": "string" },
    "Timestamp": { "type": "string" },
    "NodeID": { "type": "string" },
    "Details": { "type": "string" }
  },
  "required": ["EventName", "Severity"]
}
```

## 📨 Step 3: Add the Teams Action
1. Click **+ New step**.
2. Search for **"Post message in chat or channel"** (Microsoft Teams).
3. Set **Post as**: `Flow bot`.
4. Set **Post in**: `Chat with Flow bot` (or select a specific Test Channel).
5. For the **Message**, use dynamic content to build a professional alert:
   > **[Tezcat Alert]**: `EventName`
   > **Severity**: `Severity`
   > **Details**: `Details`
   > **Time**: `Timestamp`

## 🔗 Step 4: Save & Capture the URL
1. Click **Save**.
2. Go back to the **"When an HTTP request is received"** trigger.
3. You will now see a field: **HTTP POST URL**.
4. **Copy this URL immediately.**

## 🔐 Step 5: Update your Local Node
Open your `.env` file in the root of `EnchantedObsidian` and paste the URL:

```env
POWER_AUTOMATE_WEBHOOK_URL=https://prod-XX.westus.logic.azure.com:443/workflows/...
```

---

> [!TIP]
> **Pro Tip**: Use the "Severity" field in Power Automate to add conditional logic. For example: If `Severity` is "CRITICAL", send an "Urgent" notification or a manager DM.
