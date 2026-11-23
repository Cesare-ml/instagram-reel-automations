/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
import { graph } from "./meta.js";
const required=["ADMIN_TOKEN","META_APP_SECRET","META_VERIFY_TOKEN","IG_ACCESS_TOKEN","IG_ACCOUNT_ID","GRAPH_VERSION"];
export const missingBindings=env=>required.filter(k=>!env[k]);
export const accountMatches=(p,id)=>!!id&&String(p?.user_id||p?.id||"")===String(id);
export const hasCommentsSubscription=p=>Array.isArray(p?.data)&&p.data.some(x=>Array.isArray(x?.subscribed_fields)&&x.subscribed_fields.includes("comments"));
// Fixed initial schema only; future non-additive migrations require a reviewed migration path.
export const initialSchema=Object.freeze([
  "CREATE TABLE IF NOT EXISTS rules (\n id TEXT PRIMARY KEY, media_id TEXT NOT NULL, name TEXT NOT NULL,\n keywords TEXT NOT NULL, match_mode TEXT NOT NULL CHECK(match_mode IN ('whole','exact','contains')),\n private_message TEXT NOT NULL, public_variants TEXT NOT NULL,\n rotation TEXT NOT NULL CHECK(rotation IN ('round_robin','random')),\n enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),\n cursor INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS one_rule_per_media ON rules(media_id)",
  "CREATE TABLE IF NOT EXISTS jobs (\n comment_id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES rules(id),\n sender_key TEXT NOT NULL, occurred_at INTEGER NOT NULL, received_at INTEGER NOT NULL,\n status TEXT NOT NULL DEFAULT 'pending',\n private_message TEXT NOT NULL, public_message TEXT NOT NULL,\n error_code TEXT, updated_at INTEGER NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS once_per_sender_rule ON jobs(rule_id,sender_key)",
  "CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,received_at)",
  "CREATE INDEX IF NOT EXISTS jobs_received ON jobs(received_at)",
  "CREATE TABLE IF NOT EXISTS setup_state(id INTEGER PRIMARY KEY CHECK(id=1),received_at INTEGER NOT NULL)"
]);
export async function initializeDatabase(env){
 if(env.LIVE_SENDS!=="0")throw new Error("disable_live_before_setup");
 if(!env.DB?.prepare||!env.DB?.batch)throw new Error("missing_database_binding");
 await env.DB.batch(initialSchema.map(sql=>env.DB.prepare(sql)));
 await env.DB.prepare("SELECT id FROM rules LIMIT 1").all();
 await env.DB.prepare("SELECT comment_id FROM jobs LIMIT 1").all();
 await env.DB.prepare("SELECT received_at FROM setup_state LIMIT 1").all();
 return true;
}
export function tokenHealth(env, now=Date.now()){
 const raw=env.IG_TOKEN_EXPIRES_AT;
 if(!raw)return {state:"unknown",expiresAt:null};
 const expiresAt=Date.parse(raw);
 if(!Number.isFinite(expiresAt)||!/^\d{4}-\d{2}-\d{2}T/.test(raw))return {state:"invalid_date",expiresAt:null};
 return {state:expiresAt<=now?"expired":expiresAt-now<=7*86400000?"expiring":"valid_estimate",expiresAt};
}
export async function discoverAccount(env,request=graph){
 if(!env.IG_ACCESS_TOKEN||!env.GRAPH_VERSION)throw new Error("configuration");
 const p=await request(env,"me?fields=user_id,username");
 const id=String(p?.user_id||p?.id||"");
 if(!/^\d{1,32}$/.test(id)||typeof p.username!=="string"||!p.username)throw new Error("invalid_profile");
 return {id,username:p.username,matchesConfigured:env.IG_ACCOUNT_ID?accountMatches(p,env.IG_ACCOUNT_ID):null};
}
const errorCode=e=>/^meta_\d+_\d+$/.test(e?.message||"")?e.message:"connection_failed";
export async function diagnostics(env,request=graph){
 const missing=missingBindings(env);
 const checks={bindings:{ok:!missing.length,missing},database:{ok:false},profile:{ok:false},subscription:{ok:false},webhook:{ok:false},dryRun:{ok:false}};
 try{
  await env.DB.prepare("SELECT id FROM rules LIMIT 1").all();
  const job=await env.DB.prepare("SELECT received_at FROM jobs WHERE status='dry_run' ORDER BY received_at DESC LIMIT 1").first();
  const receipt=await env.DB.prepare("SELECT received_at FROM setup_state WHERE id=1").first();
  checks.database.ok=true;
  checks.dryRun={ok:!!job,at:job?.received_at??null};
  checks.webhook={ok:!!receipt,at:receipt?.received_at??null};
 }catch{checks.database.code=env.DB?.prepare?"initialize_database":"missing_database_binding"}
 if(!env.IG_ACCESS_TOKEN||!env.GRAPH_VERSION)return checks;
 try{
  const p=await discoverAccount(env,request);
  checks.profile={ok:p.matchesConfigured===true,username:p.username};
  if(!checks.profile.ok){checks.profile.code=env.IG_ACCOUNT_ID?"account_mismatch":"account_id_missing";return checks}
  if(missing.length)return checks;
 }catch(e){checks.profile.code=errorCode(e);return checks}
 try{
  checks.subscription.ok=hasCommentsSubscription(await request(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/subscribed_apps"));
  if(!checks.subscription.ok)checks.subscription.code="comments_not_subscribed";
 }catch(e){checks.subscription.code=errorCode(e)}
 return checks;
}
export async function subscribeComments(env,request=graph){
 if(missingBindings(env).length)throw new Error("configuration");
 if(!accountMatches(await request(env,"me?fields=user_id,username"),env.IG_ACCOUNT_ID))throw new Error("account_mismatch");
 const path=encodeURIComponent(env.IG_ACCOUNT_ID)+"/subscribed_apps";
 await request(env,path,{subscribed_fields:["comments"]});
 return hasCommentsSubscription(await request(env,path));
}
