/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
import { graph } from "./meta.js";
const required=["ADMIN_TOKEN","META_APP_SECRET","META_VERIFY_TOKEN","IG_ACCESS_TOKEN","IG_ACCOUNT_ID","GRAPH_VERSION"];
export const missingBindings=env=>required.filter(k=>!env[k]);
export const accountMatches=(p,id)=>!!id&&String(p?.user_id||p?.id||"")===String(id);
export const hasCommentsSubscription=p=>Array.isArray(p?.data)&&p.data.some(x=>Array.isArray(x?.subscribed_fields)&&x.subscribed_fields.includes("comments"));
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
 }catch{checks.database.code="apply_migrations"}
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
export async function subscribeComments(env,request=graph){
 if(missingBindings(env).length)throw new Error("configuration");
 if(!accountMatches(await request(env,"me?fields=user_id,username"),env.IG_ACCOUNT_ID))throw new Error("account_mismatch");
 const path=encodeURIComponent(env.IG_ACCOUNT_ID)+"/subscribed_apps";
 await request(env,path,{subscribed_fields:["comments"]});
 return hasCommentsSubscription(await request(env,path));
}
