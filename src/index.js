/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
import { matches,selectVariant } from "./matching.js";
import { verifySignature,secureEqual,extractComments,senderKey,graph,sendPrivate,sendPublic } from "./meta.js";
import { page } from "./page.js";
import { diagnostics,subscribeComments,initializeDatabase } from "./setup.js";
import { manifest,appIcon,serviceWorker } from "./pwa.js";
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
