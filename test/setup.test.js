/* CPAL-1.0 — Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
import test from "node:test";
import assert from "node:assert/strict";
import {diagnostics,subscribeComments,hasCommentsSubscription} from "../src/setup.js";
const env={ADMIN_TOKEN:"synthetic",META_APP_SECRET:"synthetic",META_VERIFY_TOKEN:"synthetic",IG_ACCESS_TOKEN:"synthetic",IG_ACCOUNT_ID:"123",GRAPH_VERSION:"v24.0",DB:{prepare:sql=>({all:async()=>({results:[]}),first:async()=>sql.includes("setup_state")?{received_at:123}:null})}};
test("checks return no secrets",async()=>{const d=await diagnostics(env,async(_,p)=>p.startsWith("me?")?{user_id:"123",username:"example"}:{data:[{subscribed_fields:["comments"]}]});assert(d.profile.ok&&d.subscription.ok&&d.database.ok&&d.webhook.ok);assert(!d.dryRun.ok);assert(!JSON.stringify(d).includes("synthetic"))});
test("wrong account never subscribes",async()=>{let calls=0;await assert.rejects(subscribeComments(env,async()=>{calls++;return {user_id:"999"}}),/account_mismatch/);assert.equal(calls,1)});
test("subscribe verifies readback",async()=>{let calls=[];const ok=await subscribeComments(env,async(_,p,b)=>{calls.push([p,b]);return p.startsWith("me?")?{user_id:"123"}:b?{success:true}:{data:[{subscribed_fields:["comments"]}]}});assert(ok);assert.equal(calls.length,3);assert.deepEqual(calls[1][1],{subscribed_fields:["comments"]})});
test("missing secret stops Meta calls",async()=>{const d=await diagnostics({...env,IG_ACCESS_TOKEN:""},async()=>{throw Error("unexpected")});assert(!d.bindings.ok);assert.deepEqual(d.bindings.missing,["IG_ACCESS_TOKEN"])});
