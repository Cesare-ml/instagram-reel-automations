# Public installation page

The static bilingual wizard lives in installer/. It has seven steps, source and documentation links, one-tap copy buttons, download fallbacks, a local checklist and an optional AI prompt. It does not collect secrets, personal data, analytics or account details, or send requests to Instagram/Cloudflare. Completion is self-reported, not proof of working automation. Phone-only first-time provisioning remains experimental.

Build: node scripts/build-installer.mjs (Node 22+). The result is dist/installer/. The build checks the generated Worker and schema against source and packages same-origin copies plus SHA-256 hashes and source revision metadata. No runtime dependency or credentials are needed for this static page.

To publish through GitHub Pages: repository Settings > Pages > Build and deployment > Source > GitHub Actions. Run the manual Publish installer workflow. It tests the source, builds the static assets, and publishes them; no Cloudflare resources are created. The Pages deployment output is the authoritative public URL. Until that succeeds, use the browser installation guide. The same build output can be deployed as static assets on a separate Cloudflare project if desired. Never deploy this public page over a user's personal Worker.

Actual screenshots from Android Chrome and iOS Safari must be collected during an approved test walkthrough; no fabricated dashboard images. See PRODUCT_STRATEGY.md for release gates.

Database setup now creates an empty D1 instance and binds DB; the private dashboard initializes its tables with an authenticated button in dry-run mode. The public installer still offers schema.sql as a fallback.
