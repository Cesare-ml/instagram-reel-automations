# Instagram Reel Automations

Free, self-hosted comment-to-DM automation for Instagram professional accounts. Each user deploys their own instance on Cloudflare; no subscription, hosted intermediary, or AI runtime. **Early MVP: test with a separate account before enabling live delivery.**

1. Publish a Reel with an explicit invitation, e.g. “Comment AUCTION to receive the auction link by DM.”
2. Open your private dashboard, select the Reel, define keywords, private message, and public reply variants.
3. The official Instagram webhook receives comments. On a match, the Worker sends one private reply, then a public reply only after the private send succeeds.

## Install with your AI assistant

Give the following prompt to Codex, Claude Code, or another coding assistant with terminal access:

> Install my own instance of https://github.com/Cesare-ml/instagram-reel-automations on my Cloudflare Free account. Read README.md, AGENTS.md and docs/INSTALL.md first. Guide me through creating my Meta Instagram app, professional account connection, D1 database, Worker secrets and comments webhook. Never ask me to paste credentials into chat or commit them. Verify local tests and deployment before enabling real sends. Stop for my approval before any paid resources or live activation.

For ChatGPT without terminal access, use the same prompt to obtain step-by-step commands and execute them yourself.

[Installation](docs/INSTALL.md) · [Italian guide](docs/INSTALL.it.md) · [Security](SECURITY.md) · [Design](docs/ARCHITECTURE.md)

## Features
- Reel-specific rules, Unicode/accent-insensitive keyword matching (whole words by default).
- Round-robin or random public reply selection; one private reply per matching comment.
- Manual pause, delivery status, and duplicate protection.
- Safe default: live sends disabled unless explicitly enabled at deployment and rule level.
- No scraping, no passwords for Instagram, no unsolicited outreach; official API only.
- English dashboard; responsive on mobile.

## Limits
Instagram Login requires a Business or Creator account, appropriate Meta permissions and app access. App review requirements depend on the access level and account roles. Private replies are limited by Meta; one message per comment, within the allowed time window. Cloudflare Free is sufficient for modest use within quotas, not a guarantee of unlimited free service.

## License
CPAL-1.0 (see LICENSE and NOTICE). Copyright (c) 2026 Cesare-ml. Powered by Instagram Reel Automations.
