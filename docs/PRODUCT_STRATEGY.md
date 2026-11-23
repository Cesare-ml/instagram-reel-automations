# Product strategy — mobile-first, free and independent

Decision 2026-11-23. The target audience includes creators who own only a smartphone and have no programming experience.

Recommend Meta Business Suite when its native functionality already meets the user's needs. Its availability varies by account, region and app version; do not advertise unverified feature gaps. Our aim is an open-source alternative to paid tools such as ManyChat, not merely a duplicate of native Meta automation.

## Target user journey
1. Open a public landing page, choose language and tap Create your free automation.
2. Deploy a personal Cloudflare Worker and D1 database using the browser. No mandatory coding, terminal or AI. A GitHub account may be needed.
3. Create a Meta app for the user's own professional Instagram account. Guide every click and explain credentials, app roles, access levels and review requirements.
4. Validate connection, account, database, subscriptions and signed webhook receipt. Test in dry-run before activating live messages.
5. Add the private dashboard to the phone home screen and manage automations from there.

No central SaaS, subscription, telemetry or AI runtime. AI-assisted setup remains an optional fallback. Never expose secrets in chat, source or logs.

## Priorities
- P0: browser-only deployment from a fresh free Cloudflare account. Official Deploy to Cloudflare button provisions resources using Wrangler configuration; this project uses cf, so verify compatibility before exposing a button: https://developers.cloudflare.com/workers/platform/deploy-buttons/
- P0: test full installation on Android Chrome and iOS Safari, including Meta app creation. Do not claim phone-only setup is supported before these tests.
- P0: authenticated connection diagnostics, webhook evidence, dry-run, pause, deduplication, manual token expiry remediation; only enable live sends after an opt-in test.
- P1: Italian/English browser language fallback, installable dashboard, reusable templates, accessibility, activity status.
- P1: automatic refresh of eligible long-lived tokens with secure storage, expiration and reauthorization flow.
- P2: per-Reel confirmed DM and reply statistics, portable backup, retention/deletion. Do not label deliveries as conversions.
- P3: evaluate Stories and other supported official opt-in events.

## Acceptance
A nontechnical tester installs and configures without a computer or terminal, without unexpected charges or exposing credentials. Verify actual Meta permissions and app review requirements; no guarantee of approval or unlimited free hosting. No cold messages, scraping or spam. The dashboard must be operable on a smartphone even if first-time provisioning still has limitations.

Current fallback: README and INSTALL guides, optional coding assistant. Actual mobile provisioning and live tests remain pending.
