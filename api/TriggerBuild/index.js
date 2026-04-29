const axios = require('axios');

module.exports = async function (context, req) {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "Mrswami";
    const REPO_NAME = "atxLetsPlay";
    const WORKFLOW_ID = "deploy.yml"; // Or whatever the workflow filename is

    if (!GITHUB_TOKEN) {
        context.res = {
            status: 400,
            body: { success: false, message: "GITHUB_TOKEN not configured." }
        };
        return;
    }

    try {
        const response = await axios.post(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`,
            { ref: "main" },
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        context.res = {
            status: 204, // Success with no content
            body: { success: true, message: "Build triggered successfully." }
        };
    } catch (error) {
        context.log.error('GitHub API Error:', error.response ? error.response.data : error.message);
        context.res = {
            status: error.response ? error.response.status : 500,
            body: { success: false, error: error.message }
        };
    }
};
