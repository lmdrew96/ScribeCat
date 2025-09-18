import fs from "fs/promises";import path from "path";import crypto from "crypto";
const manifestPath="scripts/assets.manifest.json";
async function sha(p){return crypto.createHash("sha256").update(await fs.readFile(p)).digest("hex")}
async function ensureDir(p){await fs.mkdir(path.dirname(p),{recursive:true})}
async function dl(url,out){const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status} ${url}`);await ensureDir(out);const t=out+".tmp-"+Date.now();const f=await fs.open(t,"w");try{const rd=r.body.getReader();for(;;){const {done,value}=await rd.read();if(done)break;await f.write(value)}}finally{await f.close()}await fs.rename(t,out)}
let m={files:[]};try{m=JSON.parse(await fs.readFile(manifestPath,"utf8"))}catch{console.log("no manifest; skipping fetch")}
const res=[];for(const it of (m.files||[])){const dest=path.resolve(process.cwd(),it.dest);try{await dl(it.url,dest);const sum=await sha(dest);if(sum!==it.sha256)throw new Error(`SHA mismatch for ${it.dest}`);res.push({dest:it.dest,ok:true});console.log("ok  "+it.dest)}catch(e){res.push({dest:it.dest,ok:false,error:String(e)});console.error("err "+it.dest+": "+(e.message||e))}}
await fs.mkdir("backups",{recursive:true});await fs.writeFile("backups/assets_fetch_result.json",JSON.stringify(res,null,2));
