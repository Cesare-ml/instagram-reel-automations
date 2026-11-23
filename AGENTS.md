# Installation and development agent contract

- This is a single-owner deployment, not a multi-tenant SaaS. Use the user's own Cloudflare and Meta accounts. Do not deploy to the maintainer's account or create paid resources without approval.
- Follow docs/INSTALL.md. Use current official Cloudflare cf CLI docs and Meta documentation, verify actual CLI syntax with --help and versions before executing.
- Ask the user to enter secrets only into Cloudflare's secret entry interface or local non-echoing prompts. Never put tokens, passwords, app secrets, database exports or actual IDs in source, Git, chat, logs or screenshots.
- Do not request Instagram passwords/cookies. Use official Instagram Login and Graph API only.
- Run npm test, verify local D1 schema and fake webhook with mocked Graph calls. Deploy with LIVE_SENDS=0 initially. Verify account, permissions, webhook subscription and rule selection; only switch LIVE_SENDS=1 with explicit approval.
- No cold messages, bulk outreach, repeated delivery after ambiguous network failures or sending public “DM sent” replies before confirmed private delivery.
- Keep CPAL attribution in source and dashboard. Use synthetic test fixtures.
