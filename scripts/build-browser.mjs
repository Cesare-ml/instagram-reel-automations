/* CPAL-1.0. Copyright (c) 2026 Cesare-ml. See LICENSE. */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
function buildBrowserWorker(sources){
 const order=["matching","meta","setup","pwa","page","index"];
 let out="/* Generated from src/ by scripts/build-browser.mjs. CPAL-1.0. Copyright (c) 2026 Cesare-ml. See LICENSE. Do not edit. */\n";
 for(const name of order){
  let source=sources[name];
  const names=[];
  source=source.replace(/^import \{([^}]+)\} from "\.\/([a-z]+)\.js";$/gm,(_,bindings,dep)=>{
   if(!order.slice(0,order.indexOf(name)).includes(dep))throw Error("Unsupported module dependency: "+dep);
   return "const {"+bindings+"} = module_"+dep+";";
  });
  if(name==="index"){
   if(!/^export default \{/m.test(source))throw Error("Missing Worker default export");
   out+="\n// src/index.js\n"+source+"\n";
   continue;
  }
  source=source.replace(/^export ((?:async )?function|const) ([A-Za-z_$][\w$]*)/gm,(_,kind,id)=>{names.push(id);return kind+" "+id});
  if(/^(?:import|export)\s/m.test(source))throw Error("Unsupported module syntax: "+name);
  out+="\nconst module_"+name+" = (() => {\n"+source+"\nreturn {"+names.join(",")+"};\n})();\n";
 }
 return out;
}
const modules=["matching","meta","setup","pwa","page","index"];
const src=Object.fromEntries(await Promise.all(modules.map(async m=>[m,await readFile(new URL("../src/"+m+".js",import.meta.url),"utf8")])));
const folder=new URL("../migrations/",import.meta.url);
const migrations=(await readdir(folder)).filter(x=>/^\d+_.+\.sql$/.test(x)).sort();
const schema="-- Generated from migrations/ by scripts/build-browser.mjs. CPAL-1.0.\n"+(await Promise.all(migrations.map(async p=>(await readFile(new URL(p,folder),"utf8")).trim()))).join("\n\n")+"\n";
const files={"worker.js":buildBrowserWorker(src),"schema.sql":schema};
const dest=new URL("../deploy/",import.meta.url);
if(process.argv.includes("--check")){for(const [name,content] of Object.entries(files)){if(await readFile(new URL(name,dest),"utf8")!==content)throw Error("Stale browser artifact: "+name+"; run npm run build:browser");}console.log("Browser artifacts current");}else{await mkdir(dest,{recursive:true});for(const [name,content] of Object.entries(files))await writeFile(new URL(name,dest),content);console.log("Browser artifacts generated");}
