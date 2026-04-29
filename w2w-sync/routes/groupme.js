const express = require('express');
const router = express.Router();
const { getGroups, getGroupMessages, sendMessage } = require('../services/groupme');
const { parseSwapMessages } = require('../services/swapParser');

// GET /api/groupme/swaps/:groupId — parse shift swap/cover requests
router.get('/swaps/:groupId', async (req, res) => {
    try {
        const token = getGMToken(req);
        if (!token) return res.status(401).json({ error: 'GroupMe token not found' });
        const messages = await getGroupMessages(token, req.params.groupId, 100);
        const swaps = parseSwapMessages(messages);
        res.json({ swaps, count: swaps.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware to check for authentication or just use env for now
// Ideally we'd store a user's GroupMe token in Firebase, but for now we'll support both env and query
function getGMToken(req) {
    return process.env.GROUPME_ACCESS_TOKEN || req.query.token || req.session.groupmeToken;
}

router.get('/groups', async (req, res) => {
    try {
        const token = getGMToken(req);
        if (!token) return res.status(401).json({ error: 'GroupMe token not found' });
        const groups = await getGroups(token);
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/messages/:groupId', async (req, res) => {
    try {
        const token = getGMToken(req);
        if (!token) return res.status(401).json({ error: 'GroupMe token not found' });
        const messages = await getGroupMessages(token, req.params.groupId);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/send/:groupId', async (req, res) => {
    try {
        const token = getGMToken(req);
        const { text } = req.body;
        if (!token) return res.status(401).json({ error: 'GroupMe token not found' });
        const result = await sendMessage(token, req.params.groupId, text);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save groupme token to session
router.post('/save-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    req.session.groupmeToken = token;
    res.json({ success: true });
});

module.exports = router;
