# Install your personal instance

## Prerequisites
- GitHub account (optional fork), Cloudflare Free account, Meta developer account, Instagram Business or Creator account you own.
- Node.js 22.18+, Git, official Cloudflare CLI: https://developers.cloudflare.com/cf/get-started/ and https://developers.cloudflare.com/cf/agents/
- Meta Instagram Login docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/

## Cloudflare
Clone the repository, run npm install and npm test. Use cf auth login (verify exact command with cf --help; complete browser login yourself). Inspect cloudflare.config.ts and verify its schema against the installed cf version. Create a D1 database named instagram-reel-automations using the Cloudflare dashboard or cf d1 create --help. Set its binding DB in cloudflare.config.ts by name or ID; apply migrations/0001_init.sql and migrations/0002_setup.sql using the D1 console or cf d1 migrations apply --help, selecting the correct database. Verify tables rules, jobs and setup_state exist. Use cf dev to check the local dashboard and cf deploy to deploy; cf is in beta, so use current CLI documentation if its configuration schema changes.

In the Worker settings, enter **Secrets** (never plaintext vars):
- ADMIN_TOKEN: unique, randomly generated long password (at least 32 random bytes).
- META_APP_SECRET: the app secret from the Meta Instagram setup; use the secret Meta uses for webhook signatures.
- META_VERIFY_TOKEN: random independent string chosen by you; enter the same string in Meta webhook verification.
- IG_ACCOUNT_ID: your professional Instagram user ID (not username).
- IG_ACCESS_TOKEN: a valid Instagram user access token with the relevant permissions.
- GRAPH_VERSION: non-secret supported API version; the config default is v24.0; verify against current Meta version.
- LIVE_SENDS: non-secret; keep 0 until successful dry-run; set 1 explicitly after approval.

Secrets must be entered by the account owner directly in the Cloudflare dashboard or via CLI secure prompts. Never commit them, share screenshots containing them, or paste them into AI chat. If cf deploy requires secrets before a Worker exists, use its guided secret provisioning or create the Worker first in the dashboard. Confirm a one-minute Cron Trigger is enabled; if not, configure it manually in Worker settings.

## Meta application
1. Open https://developers.facebook.com/apps/ and create an app for your own professional Instagram account. Add Instagram API with Instagram Login. Select the relevant business/Instagram use case shown by Meta. No Facebook Page is required for this login type.
2. Add your account to the app's roles/testers if required; accept invitations in Instagram. Request instagram_business_basic, instagram_business_manage_comments and instagram_business_manage_messages where applicable. Meta may require app review, Advanced Access or Live mode for production use; check the app dashboard rather than assume approval.
3. Use Meta's Instagram API setup to generate the user access token for your account. Obtain its Instagram user ID from setup or GET /me?fields=user_id,username. Use the token with graph.instagram.com, not graph.facebook.com. Use the documented long-lived exchange/refresh process for the token type if available. This MVP does not implement OAuth or automatic refresh; rotate token manually before expiry, update Worker secret and pause if invalid.
4. Deploy the Worker with LIVE_SENDS=0 and get its HTTPS workers.dev URL. In Meta's Webhooks configuration choose Instagram, callback https://YOUR-WORKER.workers.dev/webhook, verify token from your secret, and subscribe to comments.
5. Subscribe the account itself to the app's comments field (POST /{IG_ACCOUNT_ID}/subscribed_apps, body {"subscribed_fields":["comments"]}, Authorization Bearer token); verify with GET on the same endpoint. Alternatively use the authenticated dashboard Subscribe to comments button while LIVE_SENDS=0. Verify signed comment and matching dry-run receipt.
6. If Meta requires public privacy policy, data deletion URL or verification, publish an accurate policy for your own deployment and follow Meta's instructions. Do not publish placeholder contact details. Review https://developers.facebook.com/terms/ and applicable privacy requirements.

## Test, then activate
Open the Worker URL, enter ADMIN_TOKEN into the dashboard. Select one of your own Reels, set a keyword, DM and variants, enable the rule. Use a separate consenting tester to comment after saving. Verify a dry_run job and no DM. A dry-run comment will never be replayed. Set LIVE_SENDS=1, confirm the cron trigger and repeat using a new tester or new rule. Check the private message first, public reply second, and job status. Pause immediately on unexpected behavior.

No scraping, cold DMs, follow-up campaigns, or automated retries of ambiguous sends. Use a clear opt-in invitation in the Reel, only deliver requested content and comply with Meta policies. One delivery per recipient per rule is allowed by this MVP; duplicate comments from the same person are ignored. The dashboard is authenticated with an in-memory bearer token; consider an additional Cloudflare Access gate for the dashboard/API while leaving /webhook reachable to Meta. No automatic upgrades or paid services.

## Updates
Export non-secret rule configuration and D1 backup securely before updating. Pull reviewed changes, run tests, apply new migrations, deploy with live disabled and retest. Never fork or publish production configuration.
