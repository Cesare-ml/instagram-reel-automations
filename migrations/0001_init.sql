-- CPAL-1.0; see LICENSE.
CREATE TABLE IF NOT EXISTS rules (
 id TEXT PRIMARY KEY, media_id TEXT NOT NULL, name TEXT NOT NULL,
 keywords TEXT NOT NULL, match_mode TEXT NOT NULL CHECK(match_mode IN ('whole','exact','contains')),
 private_message TEXT NOT NULL, public_variants TEXT NOT NULL,
 rotation TEXT NOT NULL CHECK(rotation IN ('round_robin','random')),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 cursor INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_rule_per_media ON rules(media_id);
CREATE TABLE IF NOT EXISTS jobs (
 comment_id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES rules(id),
 sender_key TEXT NOT NULL, occurred_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 private_message TEXT NOT NULL, public_message TEXT NOT NULL,
 error_code TEXT, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS once_per_sender_rule ON jobs(rule_id,sender_key);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,received_at);
CREATE INDEX IF NOT EXISTS jobs_received ON jobs(received_at);
