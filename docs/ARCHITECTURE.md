# Architecture and extraction notes

Single-owner Worker + D1; the Worker serves a responsive HTML dashboard on the same origin, receives Meta-signed webhooks and runs a scheduled delivery loop. No external telemetry or AI runtime.

The maintainer's existing Instagram service supplied the Unicode matching/normalization logic, signature verification pattern, comment extraction, Graph endpoint contracts and private-first ordering. This standalone adaptation excludes all operational data, account identifiers, proprietary configuration, unrelated services, and private database contents. Public reply selection is simplified to round robin or random.

D1 stores rules and a minimal delivery ledger. A unique comment ID prevents repeat webhook deliveries; a keyed sender pseudonym and rule ID prevent repeated DMs per campaign. One rule per media avoids competing DM sends. Raw comments/usernames are not persisted. A claim is acquired before side effects. A successful private reply is committed before a public reply. Ambiguous sends are not automatically retried. A crash between provider response and database write requires manual review; exactly-once across Meta and D1 is not promised.

Cron processes up to five pending jobs per minute (300/hour) to bound traffic. D1 and Worker quotas still apply. Dry-run jobs never become live. Pausing stops queued jobs; an in-flight request cannot be recalled. Changing a rule cancels older pending deliveries. The initial build is intentionally single-account; token setup/rotation and account subscription are manual. Reels older than the most recent 400 accessible media may need a future paginated verification improvement.

Next: full Worker/D1 integration tests, durable queue and reconciliation, configurable retention with a duplicate tombstone policy, guided setup wizard, token expiry diagnostics, privacy/deletion template, localization and secure export/import. Do not activate on production accounts before integration and live consented tests.
