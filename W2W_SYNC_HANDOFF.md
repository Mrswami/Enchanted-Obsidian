# W2W to Google Calendar Sync Handoff

## The Issue: Why Automatic Sync Isn't Working
I investigated why your WhenToWork shifts weren't syncing to your Google Calendar automatically.

- **Missing Cloud Endpoint**: The automatic sync relies on a Vercel Cron job that hits the `https://ad-bee-work.vercel.app/api/cron/sync` endpoint. However, that live cloud URL is currently returning a 404 Not Found error.
- **Local vs. Cloud Mismatch**: Your local `w2w-porter` folder has the updated code for this cron job, but the live Vercel deployment is running an older version of the codebase that doesn't know this route exists.
- **Git Conflicts**: I tried to push the local changes to your GitHub repository to trigger a fresh Vercel deployment, but your local repository has diverged significantly from `origin/main` (46 commits behind with massive merge conflicts).

## Why I Couldn't Force a Manual Sync
I attempted to run the sync locally for you via the `scripts/manual-sync.js` script, but it requires two things that aren't present in the local codebase environment:

- **Firebase Credentials**: The `FIREBASE_SERVICE_ACCOUNT_JSON` is missing from the local `.env` file, which is required to fetch the list of users who have sync enabled.
- **Browser Session Tokens**: The Google Calendar API requires live OAuth tokens. Because this app was converted into a browser extension, those tokens live securely in your browser's cookie session, not on the local file system.

## Next Steps for the Obsidian Workspace
Since you are deleting this local folder, here is what the new workspace will need to do to get the automated sync up and running:

1. **Resolve the Codebase**: Pull down the latest clean version of `adBeeWork` from GitHub and integrate any missing automated sync logic (like `routes/cron.js` and `vercel.json`).
2. **Deploy to Vercel**: Push the unified code to Vercel so the `/api/cron/sync` endpoint is live.
3. **Environment Variables**: Ensure the Vercel project has the `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a `CRON_SECRET` configured in the cloud dashboard.

> **Current Workaround**: For right now, if you need the calendar updated immediately, opening the extension in your browser and clicking the manual sync button is the only way to push those shifts through using your active session!
