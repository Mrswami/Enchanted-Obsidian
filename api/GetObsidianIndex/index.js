let manifestCache = {};

module.exports = async function (context, req) {
    if (req.method === "POST") {
        // Syncing from local node
        manifestCache = req.body;
        context.res = {
            status: 200,
            body: { success: true, message: "Manifest synced to cloud." }
        };
        return;
    }

    // GET request from dashboard
    context.res = {
        status: 200,
        body: { 
            success: true, 
            manifest: manifestCache,
            // Fallback mock if cache is empty
            fallback: Object.keys(manifestCache).length === 0 ? [
                { id: "123", title: "Enchanted Architecture", status: "COMPLETE" },
                { id: "456", title: "Azure IoT Hub Patterns", status: "PENDING" }
            ] : []
        }
    };
};
