const axios = require('axios');

/**
 * GroupMe Service for basic message fetching and group info.
 */

async function getGroups(accessToken) {
    if (!accessToken) throw new Error('GroupMe Access Token is required');
    const response = await axios.get('https://api.groupme.com/v3/groups', {
        params: { token: accessToken, per_page: 10 }
    });
    return response.data.response;
}

async function getGroupMessages(accessToken, groupId, limit = 20) {
    if (!accessToken || !groupId) throw new Error('Token and Group ID required');
    const response = await axios.get(`https://api.groupme.com/v3/groups/${groupId}/messages`, {
        params: { token: accessToken, limit: Math.min(limit, 100) }
    });
    return response.data.response.messages;
}

async function sendMessage(accessToken, groupId, text) {
    if (!accessToken || !groupId || !text) throw new Error('Missing parameters');
    const response = await axios.post(`https://api.groupme.com/v3/groups/${groupId}/messages`, {
        message: {
            source_guid: Date.now().toString(),
            text: text
        }
    }, {
        params: { token: accessToken }
    });
    return response.data.response;
}

module.exports = {
    getGroups,
    getGroupMessages,
    sendMessage
};
