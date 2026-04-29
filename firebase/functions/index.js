const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { KeyClient, CryptographyClient } = require("@azure/keyvault-keys");
const { ClientAssertionCredential } = require("@azure/identity");
const crypto = require("crypto");

const { initializeApp: initAdmin } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initAdmin();
const db = getFirestore();

// Ironclad Pipeline: Asset Signing Orchestrator v2.0
exports.signAsset = onRequest(async (request, response) => {
    logger.info("Ironclad: Initiation of Identity-Backed Signing Protocol", {structuredData: true});
    
    try {
        const { assetHash, assetName, legalName, birthdate } = request.body;
        
        if (!assetHash || !legalName) {
            return response.status(400).send({ error: "Missing required identity or asset data" });
        }

        // 1. Initialize Azure Federation Config
        const vaultUrl = process.env.AZURE_VAULT_URL;
        const keyName = process.env.AZURE_KEY_NAME || "ironclad-signing-key";
        const clientId = process.env.AZURE_CLIENT_ID;
        const tenantId = process.env.AZURE_TENANT_ID;

        // 2. Identity Salting: We include the owner's details in the signature payload
        // This binds the math to the actual human being.
        const saltedPayload = `${assetHash}|${legalName}|${birthdate || "NOT_PROVIDED"}`;
        const payloadHash = crypto.createHash('sha256').update(saltedPayload).digest('hex');

        // 3. The Zero-Trust Handshake
        const getFederatedToken = async () => {
            const tokenUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=api://AzureADTokenExchange`;
            const resp = await fetch(tokenUrl, {
                headers: { 'Metadata-Flavor': 'Google' }
            });
            if (!resp.ok) throw new Error("Failed to fetch Google OIDC token");
            return await resp.text();
        };

        const credential = new ClientAssertionCredential(tenantId, clientId, getFederatedToken);

        // 4. Prepare the Cryptography Client
        const keyId = `${vaultUrl}keys/${keyName}`;
        const cryptoClient = new CryptographyClient(keyId, credential);

        // 5. Sign the Salted Hash
        const hashBuffer = Buffer.from(payloadHash, "hex");
        const signResult = await cryptoClient.sign("RS256", hashBuffer);
        
        const signature = signResult.result.toString("hex");
        const receiptId = crypto.randomUUID();

        // 6. Write to Firestore Ledger with Server-Side Timestamp
        await db.collection("receipts").doc(receiptId).set({
            assetHash,
            assetName,
            legalName,
            // Note: We DO NOT store the birthdate for privacy; it is now part of the immutable signature.
            signature,
            vaultUri: vaultUrl,
            timestamp: FieldValue.serverTimestamp() 
        });

        response.send({
            status: "sealed",
            receiptId: receiptId,
            legalName: legalName,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error("Ironclad: Zero-Trust Handshake Failed", { error: error.message });
        response.status(500).send({
            status: "failed",
            error: error.message
        });
    }
});
