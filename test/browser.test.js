/* CPAL-1.0. Copyright (c) 2026 Cesare-ml. See LICENSE. */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import modular from "../src/index.js";
import bundled from "../deploy/worker.js";
const req=path=>new Request("https://example.invalid"+path);
test("browser artifacts match source",()=>execFileSync(process.execPath,["scripts/build-browser.mjs","--check"],{stdio:"pipe"}));
test("browser schema initializes repeatedly",()=>{const db=new DatabaseSync(":memory:");try{const sql=readFileSync(new URL("../deploy/schema.sql",import.meta.url),"utf8");db.exec(sql);db.exec(sql);for(const table of ["rules","jobs","setup_state"])assert(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));}finally{db.close()}});
test("browser Worker equivalent to modular Worker for safe routes",async()=>{for(const path of ["/","/manifest.webmanifest","/app-icon.svg","/sw.js","/api/status","/webhook","/missing"]){const a=await modular.fetch(req(path),{}),b=await bundled.fetch(req(path),{});assert.equal(a.status,b.status,path);assert.equal(await a.text(),await b.text(),path)}});
test("fresh browser Worker cannot expose private API",async()=>{assert.equal((await bundled.fetch(req("/api/setup"),{})).status,401);assert.equal((await bundled.fetch(req("/api/rules"),{})).status,401);assert.equal((await bundled.fetch(req("/api/jobs"),{})).status,401)});
