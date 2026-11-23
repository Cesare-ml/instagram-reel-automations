/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const encoder = new TextEncoder();
async function key(secret, usage) {
 return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,[usage]);
}
export async function verifySignature(secret,raw,header) {
 if (!secret || !/^sha256=[0-9a-f]{64}$/i.test(header||"")) return false;
 const bytes=Uint8Array.from(header.slice(7).match(/../g),x=>parseInt(x,16));
 return crypto.subtle.verify("HMAC",await key(secret,"verify"),bytes,raw);
}
export async function secureEqual(expected, received) {
 if (!expected || !received) return false;
 const data=encoder.encode("instagram-reel-automations-auth");
 const sig=await crypto.subtle.sign("HMAC",await key(received,"sign"),data);
 return crypto.subtle.verify("HMAC",await key(expected,"verify"),sig,data);
}
export async function senderKey(secret,sender) {
 const sig=await crypto.subtle.sign("HMAC",await key(secret,"sign"),encoder.encode("sender:"+sender));
 return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function extractComments(payload, account) {
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
export async function graph(env,path,body,fetcher=fetch) {
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
export const sendPrivate=(env,id,message,fetcher)=>graph(env,encodeURIComponent(env.IG_ACCOUNT_ID)+"/messages",{recipient:{comment_id:id},message:{text:message}},fetcher);
export const sendPublic=(env,id,message,fetcher)=>graph(env,encodeURIComponent(id)+"/replies",{message},fetcher);
