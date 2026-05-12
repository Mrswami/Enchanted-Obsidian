const axios = require('axios');

module.exports = async function (context, req) {
    const { event_type, asset_id, message, status } = req.body;

    const DISCORD_WEBHOOK_URL = process.env.DISCORD_NERVE_WEBHOOK;

    if (!DISCORD_WEBHOOK_URL) {
        context.res = { status: 500, body: "Webhook URL missing from environment." };
        return;
    }

    const colorMap = {
        'SEALED': 0xa855f7, // Ironclad Violet
        'SYNCED': 0x22d3ee, // AI Core Teal
        'ALERT': 0xef4444,  // Danger Red
        'INFO': 0x10b981    // Emerald Green
    };

    const embed = {
        title: `🛰️ ENCHANTED NERVE // ${event_type}`,
        description: message || `Asset ${asset_id} has been notarized.`,
        color: colorMap[status] || 0x475569,
        fields: [
            { name: "Asset ID", value: `\`${asset_id || 'N/A'}\``, inline: true },
            { name: "Status", value: `\`${status || 'NOMINAL'}\``, inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "EO-2026-ALPHA // Sovereign Intelligence Node" }
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
        context.res = { status: 200, body: "Nerve Alert Dispatched." };
    } catch (error) {
        context.log.error("Discord Post Failed:", error);
        context.res = { status: 500, body: "Failed to dispatch alert." };
    }
};
