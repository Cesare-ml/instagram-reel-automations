# Installazione in italiano

Il servizio è personale: ognuno usa il proprio account Cloudflare, la propria app Meta e il proprio account Instagram professionale (Creator o Business). Non serve un server sempre acceso.

1. Crea un account gratuito Cloudflare e un account Meta Developers: https://developers.facebook.com/apps/.
2. Dai all'assistente IA il prompt nel README e chiedigli di seguire docs/INSTALL.md, verificando comandi e permessi sulle documentazioni ufficiali.
3. Crea un database D1 e un Worker. Applica migrations/0001_init.sql e migrations/0002_setup.sql, mantieni LIVE_SENDS=0.
4. Crea l'app Meta con Instagram Login, associa l'account Instagram, verifica i ruoli e i permessi per commenti e messaggi. Genera il token utente e recupera l'ID Instagram. Configura i segreti esclusivamente nella dashboard Cloudflare, non nella chat o nel codice.
5. Configura il webhook Instagram su https://INDIRIZZO-WORKER.workers.dev/webhook, con il verify token scelto, e sottoscrivi il campo comments sia nell'app sia per il tuo account.
6. Apri la pagina del Worker, accedi col token amministratore, scegli un Reel e configura parole chiave, DM e risposte pubbliche. Testa con un secondo account consenziente e controlla lo stato dry_run. Solo dopo la verifica attiva LIVE_SENDS=1 e ripeti con un nuovo commentatore o regola.
7. Controlla che il messaggio privato arrivi prima della risposta pubblica. Usa Pausa tutte per fermare le regole. Aggiorna manualmente il token Instagram prima della scadenza.

La licenza è CPAL-1.0. Il software non richiede abbonamento o API IA. Cloudflare Free è soggetto a quote, Meta a permessi, limiti e possibili revisioni dell'app. Non esiste garanzia di approvazione o di gratuità illimitata.

Per i dettagli tecnici, le variabili esatte e i link ufficiali consulta INSTALL.md.

[Strategia mobile-first](PRODUCT_STRATEGY.md) · [Guida smartphone (sperimentale)](MOBILE_SETUP.md)
