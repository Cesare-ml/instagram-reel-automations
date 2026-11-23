# Security

Report vulnerabilities privately via GitHub's private vulnerability reporting if enabled, otherwise contact the maintainer through their GitHub profile without including real credentials.

Keep secrets in Cloudflare secret bindings. Do not share account data, logs or production database exports. Rotate exposed credentials immediately, pause automations and review Meta access. No account passwords, cookies, scraping or third-party proxy. Only Meta's official graph.instagram.com host is contacted. Webhook HMAC is checked before parsing. Admin API is bearer-authenticated, same-origin mutations only, no cross-origin credentials. The dashboard does not persist the admin token in browser storage.

D1 retains pseudonymized delivery records; the operator is responsible for applicable privacy disclosures, minimization, deletion and retention. Use D1 administrative deletion when required, understanding it also removes duplicate protection for that record. Public attribution links only to this repository.
