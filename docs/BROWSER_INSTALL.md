# Install entirely in your browser (experimental)

No computer terminal, Git installation, Node.js or AI is required for these steps. You need your own Cloudflare Free and Meta Developer accounts, and a professional Instagram account. The browser-only route uses Cloudflare's official Worker editor, not the experimental cf CLI. Initial installation on actual Android/iOS devices has not been tested; the dashboard editor may require desktop-site mode or a computer. Do not pay to bypass a blocker.

## 1. Create the Worker

Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages), choose Create application, Start with Hello World, enter a unique Worker name and Deploy. Keep the resulting HTTPS address. Open Edit code, select the contents of worker.js and replace them with the complete [ready-to-paste Worker](../deploy/worker.js) (use GitHub's Copy raw file button or open Raw). Save/deploy. This is generated from the same source as the standard installation. Do not put personal configuration inside the file.

Official documentation: https://developers.cloudflare.com/d1/get-started/ and https://developers.cloudflare.com/d1/best-practices/remote-development/.

## 2. Create the database

In Cloudflare Storage & Databases > D1, create a database named instagram-reel-automations. Do not enter SQL yet. The authenticated setup panel can initialize the empty database after step 3. For manual fallback only, open Console and execute [schema.sql](../deploy/schema.sql), one statement at a time if necessary. Never import a database from another user.

Go back to your Worker > Bindings > Add binding > D1 database. Set the binding name exactly to DB and select your database. Add a Cron Trigger every minute (*/1 * * * *), as described in https://developers.cloudflare.com/workers/configuration/cron-triggers/.

## 3. Set up your private access and Instagram

In Worker Settings > Variables and Secrets add ADMIN_TOKEN as a Secret (at least 32 random bytes from a password manager). Add GRAPH_VERSION as a text variable with the supported Meta version (see INSTALL.md), and LIVE_SENDS as text 0. Never put secrets into a GitHub file or the Worker source. Open the Worker address, sign in with your ADMIN_TOKEN and use the setup panel. Press Initialize database. The action requires LIVE_SENDS=0 and creates missing tables and indexes without deleting data; it is safe to repeat.

Follow the Meta section in INSTALL.md or INSTALL.it.md. In Worker settings add secrets META_APP_SECRET, META_VERIFY_TOKEN and IG_ACCESS_TOKEN. In the authenticated panel use Find Instagram account, copy the returned ID into the IG_ACCOUNT_ID Worker secret, and run diagnostics again. For an existing installation, an account mismatch is a warning, not an invitation to switch account. If Meta provides an expiry, optionally set IG_TOKEN_EXPIRES_AT (ISO 8601 with timezone). Use the callback address displayed in the panel and subscribe to comments in the Meta dashboard. Press Subscribe to comments in the authenticated panel, then verify the checks. Keep LIVE_SENDS=0. Test with a consenting second account; only enable LIVE_SENDS=1 after the dry-run and permission checks.

## Update

Back up D1 privately. Pause live sends, replace the Worker with the latest reviewed generated file, apply any new migrations from the migrations folder (do not assume combined schema upgrades older versions in all future releases). Recheck the bindings, cron, login, diagnostics and dry-run. Do not reset or export secrets.

## Italiano

1. Apri Workers & Pages, crea un Worker Hello World gratuito, premi Edit code, copia tutto il file worker.js dal link sopra e pubblica.
2. Crea D1 vuoto; non serve incollare SQL. Collega il database al Worker con il nome DB e crea il trigger ogni minuto.
3. Inserisci ADMIN_TOKEN nei segreti Cloudflare, GRAPH_VERSION e LIVE_SENDS=0 come variabili. Apri il pannello personale e premi Inizializza database. Segui INSTALL.it.md per creare l'app Instagram e inserire gli altri segreti. Copia l'indirizzo webhook dal pannello e verifica la connessione.
4. Fai un commento di prova da un altro account consenziente e verifica la modalità test prima di autorizzare invii reali.
5. Aggiungi il pannello alla schermata Home. Se un passaggio non funziona da cellulare, prova la modalità sito desktop; non è ancora garantita la compatibilità dell'editor Cloudflare e Meta con tutti gli smartphone.
