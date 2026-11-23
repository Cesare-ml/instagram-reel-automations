/* CPAL-1.0; see LICENSE. */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root=new URL("../",import.meta.url);
const dest=new URL("dist/installer/",root);
execFileSync(process.execPath,["scripts/build-browser.mjs","--check"],{cwd:root,stdio:"inherit"});
await mkdir(new URL("files/",dest),{recursive:true});
for(const f of ["index.html","style.css","setup.js"])await copyFile(new URL("installer/"+f,root),new URL(f,dest));
await copyFile(new URL("LICENSE",root),new URL("LICENSE.txt",dest));
const hashes={};
for(const f of ["worker.js","schema.sql"]){const bytes=await readFile(new URL("deploy/"+f,root));await writeFile(new URL("files/"+f,dest),bytes);hashes[f]=createHash("sha256").update(bytes).digest("hex")}
const pkg=JSON.parse(await readFile(new URL("package.json",root),"utf8"));
let commit=process.env.GITHUB_SHA||"local";
try{commit=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim()}catch{}
await writeFile(new URL("files/version.json",dest),JSON.stringify({version:pkg.version,commit,sha256:hashes},null,2)+"\n");
await writeFile(new URL(".nojekyll",dest),"");
console.log("Static installer built: dist/installer");
