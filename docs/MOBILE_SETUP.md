# Smartphone setup — preview

Initial browser-only provisioning is NOT yet verified; use INSTALL.md or INSTALL.it.md as fallback.

1. Create free accounts at https://dash.cloudflare.com/ and https://developers.facebook.com/apps/.
2. Provision the Worker and D1; apply all migrations. The Cloudflare Deploy button documents Wrangler config support; cf compatibility is not established, so one-click is not advertised yet.
3. Enter required secrets only in Cloudflare Worker settings. Keep LIVE_SENDS=0 and configure the cron.
4. Open the Worker URL and log in with ADMIN_TOKEN. Copy the webhook address, configure the callback and comments field in the Meta app, then press the account subscription button.
5. Run diagnostics and confirm the correct account, subscription, a real signed comment and a matching dry-run event. Green checks alone do not prove send permission. Follow INSTALL.md for live activation.
6. Use Safari Share > Add to Home Screen or Chrome menu > Add to Home screen / Install if offered. Internet is required; private data is not cached.

Italiano: la configurazione iniziale del pannello segue la lingua del browser (italiano o inglese). Per il primo deployment consulta INSTALL.it.md; alcuni passaggi Cloudflare/Meta potrebbero ancora richiedere un computer. Non acquistare servizi per aggirare i problemi.
