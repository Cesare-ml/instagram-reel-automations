/* Generated from src/ by scripts/build-browser.mjs. CPAL-1.0. Copyright (c) 2026 Cesare-ml. See LICENSE. Do not edit. */

const module_matching = (() => {
/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const APOSTROPHES = /['’‘‛`´]/gu;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const EMPHATIC_LETTER_RUN = /(\p{L})\1{2,}/gu;

function normalizeInstagramText(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("it-IT")
    // Instagram comments often stretch a letter for emphasis (for example
    // "mangoooo"). Collapse only runs of 3+ so legitimate double letters
    // such as "palla" remain distinct from "pala".
    .replace(EMPHATIC_LETTER_RUN, "$1")
    .replace(APOSTROPHES, " ")
    .replace(NON_WORD, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function containsWholeTerm(normalizedText, normalizedTerm) {
  return normalizedTerm.length > 0 && ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

function matches(comment, keywords, mode="whole") {
 const normalized=normalizeInstagramText(comment);
 return keywords.some(k=>{
  const term=normalizeInstagramText(k);
  return !!term && (mode==="exact" ? normalized===term : mode==="contains" ? normalized.includes(term) : containsWholeTerm(normalized,term));
 });
}
function selectVariant(variants, mode, cursor, random=Math.random) {
 if (!variants.length) return "";
 return variants[mode==="random" ? Math.floor(random()*variants.length) : cursor%variants.length];
}

return {normalizeInstagramText,containsWholeTerm,matches,selectVariant};
})();

const module_meta = (() => {
/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const encoder = new TextEncoder();
async function key(secret, usage) {
 return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,[usage]);
}
async function verifySignature(secret,raw,header) {
 if (!secret || !/^sha256=[0-9a-f]{64}$/i.test(header||"")) return false;
 const bytes=Uint8Array.from(header.slice(7).match(/../g),x=>parseInt(x,16));
 return crypto.subtle.verify("HMAC",await key(secret,"verify"),bytes,raw);
}
async function secureEqual(expected, received) {
 if (!expected || !received) return false;
 const data=encoder.encode("instagram-reel-automations-auth");
 const sig=await crypto.subtle.sign("HMAC",await key(received,"sign"),data);
 return crypto.subtle.verify("HMAC",await key(expected,"verify"),sig,data);
}
async function senderKey(secret,sender) {
 const sig=await crypto.subtle.sign("HMAC",await key(secret,"sign"),encoder.encode("sender:"+sender));
 return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function extractComments(payload, account) {
 if (payload?.object!=="instagram") return [];
 const result=[];
 for (const entry of Array.isArray(payload.entry)?payload.entry:[]) {
  if (String(entry.id)!==account) continue;
  for (const change of Array.isArray(entry.changes)?entry.changes:[]) {
   const v=change?.value;
   if (change?.field!=="comments" || !v || v.parent_id || v.parent_comment_id) continue;
   const id=String(v.id||v.comment_id||""),media=String(v.media?.id||v.media_id||""),sender=String(v.from?.id||v.from_id||"");
   if (!/^\d{1,32}$/.test(id)||!/^\d{1,32}$/.test(media)||!sender||sender===account||typeof v.text!=="string") continue;
   const ts=Number(v.timestamp||entry.time);
   const occurred=Number.isFinite(ts)&&ts>0?(ts<1e12?ts*1000:ts):Date.parse(v.timestamp||"");
   if (!Number.isFinite(occurred)) continue;
   result.push({id,media,sender,text:v.text,occurred});
   if(result.length>100) throw new Error("too_many_comments");
  }
 }
 return result;
}
async function graph(env,path,body,fetcher=fetch) {
 if(!/^v\d+\.\d+$/.test(env.GRAPH_VERSION)||!env.IG_ACCESS_TOKEN) throw new Error("configuration");
 const res=await fetcher("https://graph.instagram.com/"+env.GRAPH_VERSION+"/"+path,{
  method:body===undefined?"GET":"POST",
  headers:{Authorization:"Bearer "+env.IG_ACCESS_TOKEN,"Content-Type":"application/json"},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)
 });
 let data;
 try{data=await res.json()}catch{throw new Error("ambiguous_response")}
 if(!res.ok||data.error) throw new Error("meta_"+res.status+"_"+(Number(data.error?.code)||0));
 return data;
}
const sendPrivate=(env,id,message,fetcher)=>graph(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/messages",{recipient:{comment_id:id},message:{text:message}},fetcher);
const sendPublic=(env,id,message,fetcher)=>graph(env,encodeURIComponent(id)+"/replies",{message},fetcher);

return {verifySignature,secureEqual,senderKey,extractComments,graph,sendPrivate,sendPublic};
})();

const module_setup = (() => {
/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const { graph } = module_meta;
const required=["ADMIN_TOKEN","META_APP_SECRET","META_VERIFY_TOKEN","IG_ACCESS_TOKEN","IG_ACCOUNT_ID","GRAPH_VERSION"];
const missingBindings=env=>required.filter(k=>!env[k]);
const accountMatches=(p,id)=>!!id&&String(p?.user_id||p?.id||"")===String(id);
const hasCommentsSubscription=p=>Array.isArray(p?.data)&&p.data.some(x=>Array.isArray(x?.subscribed_fields)&&x.subscribed_fields.includes("comments"));
// Fixed initial schema only; future non-additive migrations require a reviewed migration path.
const initialSchema=Object.freeze([
  "CREATE TABLE IF NOT EXISTS rules (\n id TEXT PRIMARY KEY, media_id TEXT NOT NULL, name TEXT NOT NULL,\n keywords TEXT NOT NULL, match_mode TEXT NOT NULL CHECK(match_mode IN ('whole','exact','contains')),\n private_message TEXT NOT NULL, public_variants TEXT NOT NULL,\n rotation TEXT NOT NULL CHECK(rotation IN ('round_robin','random')),\n enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),\n cursor INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS one_rule_per_media ON rules(media_id)",
  "CREATE TABLE IF NOT EXISTS jobs (\n comment_id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES rules(id),\n sender_key TEXT NOT NULL, occurred_at INTEGER NOT NULL, received_at INTEGER NOT NULL,\n status TEXT NOT NULL DEFAULT 'pending',\n private_message TEXT NOT NULL, public_message TEXT NOT NULL,\n error_code TEXT, updated_at INTEGER NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS once_per_sender_rule ON jobs(rule_id,sender_key)",
  "CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,received_at)",
  "CREATE INDEX IF NOT EXISTS jobs_received ON jobs(received_at)",
  "CREATE TABLE IF NOT EXISTS setup_state(id INTEGER PRIMARY KEY CHECK(id=1),received_at INTEGER NOT NULL)"
]);
async function initializeDatabase(env){
 if(env.LIVE_SENDS!=="0")throw new Error("disable_live_before_setup");
 if(!env.DB?.prepare||!env.DB?.batch)throw new Error("missing_database_binding");
 await env.DB.batch(initialSchema.map(sql=>env.DB.prepare(sql)));
 await env.DB.prepare("SELECT id FROM rules LIMIT 1").all();
 await env.DB.prepare("SELECT comment_id FROM jobs LIMIT 1").all();
 await env.DB.prepare("SELECT received_at FROM setup_state LIMIT 1").all();
 return true;
}
const errorCode=e=>/^meta_\d+_\d+$/.test(e?.message||"")?e.message:"connection_failed";
async function diagnostics(env,request=graph){
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
 if(missing.length)return checks;
 try{
  const p=await request(env,"me?fields=user_id,username");
  checks.profile={ok:accountMatches(p,env.IG_ACCOUNT_ID),username:typeof p.username==="string"?p.username:null};
  if(!checks.profile.ok){checks.profile.code="account_mismatch";return checks}
 }catch(e){checks.profile.code=errorCode(e);return checks}
 try{
  checks.subscription.ok=hasCommentsSubscription(await request(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/subscribed_apps"));
  if(!checks.subscription.ok)checks.subscription.code="comments_not_subscribed";
 }catch(e){checks.subscription.code=errorCode(e)}
 return checks;
}
async function subscribeComments(env,request=graph){
 if(missingBindings(env).length)throw new Error("configuration");
 if(!accountMatches(await request(env,"me?fields=user_id,username"),env.IG_ACCOUNT_ID))throw new Error("account_mismatch");
 const path=encodeURIComponent(env.IG_ACCOUNT_ID)+"/subscribed_apps";
 await request(env,path,{subscribed_fields:["comments"]});
 return hasCommentsSubscription(await request(env,path));
}

return {missingBindings,accountMatches,hasCommentsSubscription,initialSchema,initializeDatabase,diagnostics,subscribeComments};
})();

const module_pwa = (() => {
/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const manifest={id:"/",name:"Instagram Reel Automations",short_name:"Reel Automations",start_url:"/",scope:"/",display:"standalone",background_color:"#f3f4f6",theme_color:"#25283a",icons:[{src:"/app-icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]};
const appIcon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="42" fill="#25283a"/><path d="M40 52h112v78H89l-31 25v-25H40z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/><path d="m88 70 30 21-30 21z" fill="#fff"/></svg>';
// Network only: never cache credentials or API responses.
const serviceWorker="self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));";

return {manifest,appIcon,serviceWorker};
})();

const module_page = (() => {
/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instagram Reel Automations</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#25283a"><link rel="icon" href="/app-icon.svg"><style>
*{box-sizing:border-box}body{margin:0;background:#f3f4f6;color:#20232c;font:16px system-ui,sans-serif}main{max-width:850px;margin:auto;padding:28px 16px}h1{font-size:clamp(24px,5vw,36px);margin:0 0 6px}h2{font-size:19px;margin-top:0}section{background:white;border:1px solid #e0e2e9;border-radius:16px;padding:20px;margin:16px 0}label{display:block;font-weight:600;margin:12px 0 4px}input,textarea,select,button{font:inherit;border:1px solid #cbd0da;padding:10px;border-radius:8px}input:not([type=checkbox]),textarea,select{width:100%}textarea{min-height:84px}button{background:#25283a;color:white;cursor:pointer;margin:10px 5px 0 0}button.secondary{background:white;color:#25283a}pre{white-space:pre-wrap;overflow-wrap:anywhere}small,footer{color:#595d6b}a{color:#393d8c}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:600px){.grid{grid-template-columns:1fr}}#feedback{min-height:24px;white-space:pre-wrap}
button{min-height:44px}#checks li{margin:10px 0}#setup-summary{white-space:pre-wrap}</style></head><body><main><h1>Instagram Reel Automations</h1><small>Self-hosted · Your account, your data</small><section><h2>Connect to dashboard</h2><label for="token">Admin token (not your Instagram token)</label><input type="password" id="token" autocomplete="off"><button id="connect">Connect</button><button class="secondary" id="logout">Lock</button><p id="status" aria-live="polite"></p></section><div id="panel" hidden><section><h2 id="setup-title">Setup</h2><p id="setup-intro"></p><p><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare</a> · <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Meta Developers</a> · <a href="https://github.com/Cesare-ml/instagram-reel-automations/blob/main/docs/MOBILE_SETUP.md" target="_blank" rel="noopener noreferrer" id="setup-guide">Guide</a></p><label id="callback-label" for="callback">Webhook URL</label><input id="callback" readonly><button class="secondary" id="copy-callback">Copy URL</button><button id="diagnose">Check connection</button><button class="secondary" id="init-db" disabled>Initialize database</button><button class="secondary" id="subscribe" disabled>Subscribe</button><ul id="checks" aria-live="polite"></ul><p id="setup-summary" aria-live="polite"></p><p id="install-help"></p></section><section><h2>Automation</h2><label for="reels">Your Reels</label><select id="reels"></select><button class="secondary" id="more">More Reels</button><label for="media">Reel ID</label><input id="media" inputmode="numeric"><label for="name">Name</label><input id="name" placeholder="Auction invitation"><label for="keywords">Keywords (one per line)</label><textarea id="keywords" placeholder="auction"></textarea><div class="grid"><div><label for="match">Matching</label><select id="match"><option value="whole">Whole word</option><option value="exact">Exact comment</option><option value="contains">Contains text</option></select></div><div><label for="rotation">Public reply selection</label><select id="rotation"><option value="round_robin">Round robin</option><option value="random">Random</option></select></div></div><label for="dm">Private message</label><textarea id="dm" maxlength="1000" placeholder="Here is the link you requested…"></textarea><label for="replies">Public replies (one per line, optional)</label><textarea id="replies" placeholder="Sent you the details!"></textarea><label><input type="checkbox" id="enabled"> Enable this automation</label><button id="save">Save automation</button><button class="secondary" id="pause">Pause all</button><p id="feedback" aria-live="polite"></p></section><section><h2>Saved automations</h2><div id="rules"></div></section><section><h2>Recent delivery activity</h2><button class="secondary" id="refresh">Refresh</button><pre id="jobs"></pre></section></div><footer>Powered by <a href="https://github.com/Cesare-ml/instagram-reel-automations">Instagram Reel Automations</a> · Copyright © 2026 Cesare-ml · CPAL-1.0</footer></main><script>
const el=id=>document.getElementById(id);let token='',next=null;
async function call(path,body){const r=await fetch('/api/'+path,{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data}
function feedback(s){el('feedback').textContent=s}
const lines=id=>el(id).value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
function edit(r){el('media').value=r.media_id;el('name').value=r.name;el('keywords').value=r.keywords.join('\\n');el('match').value=r.match_mode;el('rotation').value=r.rotation;el('dm').value=r.private_message;el('replies').value=r.public_variants.join('\\n');el('enabled').checked=!!r.enabled}
async function refresh(){const rules=await call('rules');el('rules').replaceChildren();for(const r of rules){const b=document.createElement('button');b.className='secondary';b.textContent=r.name+(r.enabled?' · active':' · paused');b.onclick=()=>edit(r);el('rules').append(b)}const jobs=await call('jobs');el('jobs').textContent=jobs.map(j=>new Date(j.received_at).toLocaleString()+' · '+j.status+(j.error_code?' · '+j.error_code:'')).join('\\n')||'No activity yet.'}
async function reels(reset){if(reset){next=null;el('reels').replaceChildren(new Option('Select a Reel',''))}const data=await call('reels'+(next?'?after='+encodeURIComponent(next):''));for(const r of data.items)el('reels').append(new Option((r.caption||r.id).slice(0,90),r.id));next=data.next;el('more').disabled=!next}
el('reels').onchange=()=>{el('media').value=el('reels').value};
el('connect').onclick=async()=>{token=el('token').value;el('token').value='';try{const s=await call('status');el('status').textContent=s.live?'Live delivery enabled':'Dry-run mode — no messages sent';el('panel').hidden=false;const d=await diagnose();if(d?.checks.database.ok)await refresh();if(d?.checks.profile.ok)await reels(true)}catch(e){el('status').textContent=e.message}};
el('logout').onclick=()=>location.reload();
el('more').onclick=()=>reels(false).catch(e=>feedback(e.message));
el('refresh').onclick=()=>refresh().catch(e=>feedback(e.message));
el('save').onclick=async()=>{try{await call('rules',{media_id:el('media').value,name:el('name').value,keywords:lines('keywords'),match_mode:el('match').value,rotation:el('rotation').value,private_message:el('dm').value,public_variants:lines('replies'),enabled:el('enabled').checked});feedback('Saved. Only new matching comments are processed.');await refresh()}catch(e){feedback(e.message)}};
el('pause').onclick=async()=>{try{await call('pause',{});feedback('All automations paused.');await refresh()}catch(e){feedback(e.message)}};

const italian=navigator.language.toLowerCase().startsWith('it');
const tr=(en,it)=>italian?it:en;
el('setup-title').textContent=tr('Setup and diagnostics','Configurazione e diagnostica');
el('setup-intro').textContent=tr('Configure Worker secrets and D1, then set the callback and comments field in Meta. Subscribe your account and test a matching comment in dry-run.','Configura i segreti del Worker e D1, poi imposta il webhook e il campo comments nell’app Meta. Attiva la ricezione commenti e prova un commento in modalità test.');
el('setup-guide').textContent=tr('Setup guide','Guida alla configurazione');
el('callback-label').textContent=tr('Webhook URL','Indirizzo webhook');
el('copy-callback').textContent=tr('Copy URL','Copia indirizzo');
el('diagnose').textContent=tr('Check connection','Verifica connessione');
el('init-db').textContent=tr('Initialize database','Inizializza database');
el('subscribe').textContent=tr('Subscribe to comments','Attiva ricezione commenti');
el('install-help').textContent=tr('Add the dashboard to your home screen from the browser menu. Internet is required.','Aggiungi il pannello alla schermata Home dal menu del browser. Serve internet.');
const labels={bindings:tr('Configuration','Configurazione'),database:tr('Database migrations','Migrazioni database'),profile:tr('Instagram account','Account Instagram'),subscription:tr('Comments subscription','Sottoscrizione commenti'),webhook:tr('Signed comment received','Webhook commento firmato ricevuto'),dryRun:tr('Matching dry-run comment','Commento corrispondente in modalità test')};
async function diagnose(){
 el('setup-summary').textContent=tr('Checking…','Verifica in corso…');el('subscribe').disabled=true;el('init-db').disabled=true;
 try{const d=await call('setup');el('callback').value=d.callback;el('checks').replaceChildren();
 for(const [key,c] of Object.entries(d.checks)){const li=document.createElement('li');li.textContent=(c.ok?'✓ ':'○ ')+labels[key]+': '+(c.ok?tr('Confirmed','Verificato'):tr('Not verified','Non verificato'))+(c.username?' (@'+c.username+')':'')+(c.code?' · '+c.code:'')+(c.missing?.length?' · '+c.missing.join(', '):'');el('checks').append(li)}
 el('subscribe').disabled=d.live||!d.checks.profile.ok||!d.checks.database.ok;
 el('init-db').disabled=d.live||d.checks.database.ok||d.checks.database.code==='missing_database_binding';
 el('setup-summary').textContent=d.live?tr('Live mode: disable before changing subscription.','Invii reali attivi: disattivali prima di modificare la sottoscrizione.'):tr('Dry-run: no messages sent. Green checks do not prove live send permission.','Modalità test: nessun messaggio inviato. I controlli verdi non garantiscono i permessi di invio reale.');
 return d;
 }catch(e){el('setup-summary').textContent=e.message;return null}
}
el('diagnose').onclick=diagnose;
el('init-db').onclick=async()=>{if(!confirm(tr('Create missing tables in your personal database? Existing data is not deleted.','Creare le tabelle mancanti nel tuo database personale? I dati esistenti non vengono eliminati.')))return;el('init-db').disabled=true;try{await call('setup/database',{});const d=await diagnose();if(d?.checks.database.ok)await refresh()}catch(e){el('setup-summary').textContent=e.message;el('init-db').disabled=false}};
el('copy-callback').onclick=async()=>{try{await navigator.clipboard.writeText(el('callback').value);el('setup-summary').textContent=tr('URL copied','Indirizzo copiato')}catch{el('callback').select()}};
el('subscribe').onclick=async()=>{if(!confirm(tr('Subscribe after configuring the app webhook in Meta?','Attivare la ricezione dopo aver configurato il webhook nell’app Meta?')))return;el('subscribe').disabled=true;try{await call('setup/subscribe',{});await diagnose()}catch(e){el('setup-summary').textContent=e.message}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
</script></body></html>`;

return {page};
})();

// src/index.js
/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const { matches,selectVariant } = module_matching;
const { verifySignature,secureEqual,extractComments,senderKey,graph,sendPrivate,sendPublic } = module_meta;
const { page } = module_page;
const { diagnostics,subscribeComments,initializeDatabase } = module_setup;
const { manifest,appIcon,serviceWorker } = module_pwa;
const DAY=86400000;
const json=(x,status=200)=>Response.json(x,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const idOk=x=>typeof x==="string"&&/^\d{1,32}$/.test(x);
const parseRule=r=>({...r,keywords:JSON.parse(r.keywords),public_variants:JSON.parse(r.public_variants)});
function validateRule(v) {
 const arr=(a,max)=>Array.isArray(a)&&a.length<=20&&a.every(s=>typeof s==="string"&&s.trim()&&s.length<=max);
 if(!v||!idOk(v.media_id)||typeof v.name!=="string"||!v.name.trim()||v.name.length>100||!arr(v.keywords,80)||!v.keywords.length||!arr(v.public_variants,500)||typeof v.private_message!=="string"||!v.private_message.trim()||v.private_message.length>1000||!["whole","exact","contains"].includes(v.match_mode)||!["round_robin","random"].includes(v.rotation)||typeof v.enabled!=="boolean") throw new Error("invalid_rule");
}
async function bounded(req,max){
 const reader=req.body?.getReader(); if(!reader)return new Uint8Array();
 const chunks=[];let total=0;
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw new Error("body_too_large")}chunks.push(value)}
 const out=new Uint8Array(total);let off=0;for(const c of chunks){out.set(c,off);off+=c.length}return out;
}
async function ingress(req,env){
 if(req.method==="GET"){
  const p=new URL(req.url).searchParams;
  return p.get("hub.mode")==="subscribe"&&await secureEqual(env.META_VERIFY_TOKEN,p.get("hub.verify_token"))?new Response(p.get("hub.challenge")||"",{headers:{"Cache-Control":"no-store"}}):json({error:"verification"},403);
 }
 if(req.method!=="POST")return json({error:"method"},405);
 let raw;try{raw=await bounded(req,120000)}catch{return json({error:"size"},413)}
 if(!await verifySignature(env.META_APP_SECRET,raw,req.headers.get("X-Hub-Signature-256")))return json({error:"signature"},401);
 let events;try{events=extractComments(JSON.parse(new TextDecoder().decode(raw)),env.IG_ACCOUNT_ID)}catch{return json({error:"invalid_event"},400)}
 // Limit work per invocation. Batches persist atomically before acknowledging.
 const rows=(await env.DB.prepare("SELECT * FROM rules WHERE enabled=1 LIMIT 100").all()).results.map(parseRule);
 const map=new Map(rows.map(r=>[r.media_id,r]));
 const statements=[];
 for(const event of events){
  const r=map.get(event.media);
  if(!r||!matches(event.text,r.keywords,r.match_mode)||event.occurred<Date.now()-7*DAY||event.occurred>Date.now()+300000||event.occurred<r.updated_at)continue;
  const sender=await senderKey(env.META_APP_SECRET,event.sender);
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO jobs(comment_id,rule_id,sender_key,occurred_at,received_at,status,private_message,public_message,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(event.id,r.id,sender,event.occurred,Date.now(),env.LIVE_SENDS==="1"?"pending":"dry_run",r.private_message,"",Date.now()));
 }
 if(events.length)statements.push(env.DB.prepare("INSERT INTO setup_state(id,received_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET received_at=excluded.received_at").bind(Date.now()));
 if(statements.length)await env.DB.batch(statements);
 return json({accepted:true});
}
async function processJobs(env){
 if(env.LIVE_SENDS!=="1")return;
 const now=Date.now();
 // A crashed or ambiguous send is never automatically replayed.
 await env.DB.prepare("UPDATE jobs SET status='uncertain', error_code='interrupted',updated_at=? WHERE status IN ('sending_private','sending_public') AND updated_at<?").bind(now,now-600000).run();
 const jobs=(await env.DB.prepare("SELECT * FROM jobs WHERE status='pending' ORDER BY received_at LIMIT 5").all()).results;
 for(const j of jobs){
  const claim=await env.DB.prepare("UPDATE jobs SET status='sending_private',updated_at=? WHERE comment_id=? AND status='pending' RETURNING comment_id").bind(Date.now(),j.comment_id).first();
  if(!claim)continue;
  let r=await env.DB.prepare("SELECT * FROM rules WHERE id=? AND enabled=1").bind(j.rule_id).first();
  if(!r||j.occurred_at<now-7*DAY||j.received_at<r.updated_at){await state(env,j,"cancelled","rule_paused_changed_or_expired");continue}
  try{
   const sent=await sendPrivate(env,j.comment_id,j.private_message);
   if(!sent.message_id)throw new Error("ambiguous_response");
  }catch(e){await state(env,j,"private_failed",safeError(e));continue}
  // Persist successful DM before any public reply. Rotation counter is atomically reserved.
  await state(env,j,"private_sent");
  r=await env.DB.prepare("UPDATE rules SET cursor=cursor+1 WHERE id=? AND enabled=1 RETURNING *").bind(j.rule_id).first();
  if(!r)continue;
  const variant=selectVariant(JSON.parse(r.public_variants),r.rotation,r.cursor-1);
  if(!variant){await state(env,j,"done");continue}
  await env.DB.prepare("UPDATE jobs SET status='sending_public',public_message=?,updated_at=? WHERE comment_id=?").bind(variant,Date.now(),j.comment_id).run();
  try{const sent=await sendPublic(env,j.comment_id,variant);if(!sent.id)throw new Error("ambiguous_response");await state(env,j,"done")}
  catch(e){await state(env,j,"public_failed",safeError(e))}
 }
}
const safeError=e=>/^meta_\d+_\d+$/.test(e?.message||"")?e.message:"ambiguous_or_transport";
async function state(env,j,status,error=null){await env.DB.prepare("UPDATE jobs SET status=?,error_code=?,updated_at=? WHERE comment_id=?").bind(status,error,Date.now(),j.comment_id).run()}
async function api(req,env,url){
 if(!await secureEqual(env.ADMIN_TOKEN,req.headers.get("Authorization")?.replace(/^Bearer /,"")))return json({error:"unauthorized"},401);
 if(req.method!=="GET"&&req.headers.get("Origin")!==url.origin)return json({error:"origin"},403);
 const path=url.pathname;
 if(path==="/api/status"&&req.method==="GET")return json({live:env.LIVE_SENDS==="1",configured:!!(env.IG_ACCESS_TOKEN&&env.IG_ACCOUNT_ID&&env.META_APP_SECRET&&env.META_VERIFY_TOKEN)});
 if(path==="/api/setup"&&req.method==="GET")return json({checks:await diagnostics(env),callback:url.origin+"/webhook",live:env.LIVE_SENDS==="1"});
 if(path==="/api/setup/database"&&req.method==="POST"){
  if(env.LIVE_SENDS!=="0")return json({error:"disable_live_before_setup"},409);
  if(!env.DB?.prepare||!env.DB?.batch)return json({error:"missing_database_binding"},409);
  await initializeDatabase(env);
  return json({ok:true});
 }
 if(path==="/api/setup/subscribe"&&req.method==="POST"){
  if(env.LIVE_SENDS==="1")return json({error:"disable_live_before_setup"},409);
  const ok=await subscribeComments(env);return json({ok},ok?200:409);
 }
 if(path==="/api/reels"&&req.method==="GET"){
  const cursor=url.searchParams.get("after");
  const data=await graph(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/media?fields=id,caption,media_product_type,permalink,timestamp&limit=50"+(cursor?"&after="+encodeURIComponent(cursor):""));
  return json({items:(data.data||[]).filter(x=>x.media_product_type==="REELS"),next:data.paging?.next?data.paging?.cursors?.after:null});
 }
 if(path==="/api/rules"&&req.method==="GET")return json((await env.DB.prepare("SELECT * FROM rules ORDER BY created_at DESC LIMIT 100").all()).results.map(parseRule));
 if(path==="/api/rules"&&req.method==="POST"){
  let v;try{v=JSON.parse(new TextDecoder().decode(await bounded(req,30000)));validateRule(v)}catch{return json({error:"invalid_rule"},400)}
  const old=await env.DB.prepare("SELECT id FROM rules WHERE media_id=?").bind(v.media_id).first();
  if(!old&&(await env.DB.prepare("SELECT count(*) n FROM rules").first()).n>=100)return json({error:"rule_limit"},409);
  // Verify this is one of the account's own Reels: only accept IDs returned by its media list.
  let after="",found=false;
  for(let i=0;i<8&&!found;i++){const m=await graph(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/media?fields=id,media_product_type&limit=50"+(after?"&after="+encodeURIComponent(after):""));found=(m.data||[]).some(x=>x.id===v.media_id&&x.media_product_type==="REELS");after=m.paging?.next?m.paging?.cursors?.after:"";if(!after)break}
  if(!found)return json({error:"reel_not_found"},400);
  const now=Date.now();
  await env.DB.prepare("INSERT INTO rules(id,media_id,name,keywords,match_mode,private_message,public_variants,rotation,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(media_id) DO UPDATE SET name=excluded.name,keywords=excluded.keywords,match_mode=excluded.match_mode,private_message=excluded.private_message,public_variants=excluded.public_variants,rotation=excluded.rotation,enabled=excluded.enabled,cursor=0,updated_at=excluded.updated_at").bind(crypto.randomUUID(),v.media_id,v.name.trim(),JSON.stringify(v.keywords),v.match_mode,v.private_message,JSON.stringify(v.public_variants),v.rotation,+v.enabled,now,now).run();
  return json({saved:true});
 }
 if(path==="/api/pause"&&req.method==="POST"){await env.DB.prepare("UPDATE rules SET enabled=0,updated_at=? WHERE enabled=1").bind(Date.now()).run();return json({paused:true})}
 if(path==="/api/jobs"&&req.method==="GET")return json((await env.DB.prepare("SELECT rule_id,status,error_code,received_at,updated_at FROM jobs ORDER BY received_at DESC LIMIT 100").all()).results);
 return json({error:"not_found"},404);
}
export default {
 async fetch(req,env){
  const url=new URL(req.url);
  try{
   if(url.pathname==="/webhook")return await ingress(req,env);
   if(url.pathname.startsWith("/api/"))return await api(req,env,url);
   if(req.method==="GET"&&url.pathname==="/manifest.webmanifest")return new Response(JSON.stringify(manifest),{headers:{"Content-Type":"application/manifest+json","Cache-Control":"public,max-age=3600"}});
   if(req.method==="GET"&&url.pathname==="/app-icon.svg")return new Response(appIcon,{headers:{"Content-Type":"image/svg+xml","Cache-Control":"public,max-age=3600","X-Content-Type-Options":"nosniff"}});
   if(req.method==="GET"&&url.pathname==="/sw.js")return new Response(serviceWorker,{headers:{"Content-Type":"text/javascript","Cache-Control":"no-cache"}});
   if(url.pathname==="/"&&req.method==="GET")return new Response(page,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; manifest-src 'self'; img-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
   return json({error:"not_found"},404);
  }catch(e){return json({error:"request_failed",code:safeError(e)},503)}
 },
 async scheduled(_event,env){await processJobs(env)}
};

