import fs from "fs/promises";import path from "path";import crypto from "crypto";
const p="scripts/assets.manifest.json";async function sha(f){return crypto.createHash("sha256").update(await fs.readFile(f)).digest("hex")}
let m;try{m=JSON.parse(await fs.readFile(p,"utf8"))}catch{console.log("no manifest; skipping fetch");process.exit(0)}
async function dl(u,o){const r=await fetch(u);if(!r.ok)throw new Error("HTTP "+r.status+" "+u);await fs.mkdir(path.dirname(o),{recursive:true});const t=o+".tmp-"+Date.now();const f=await fs.open(t,"w");try{const rd=r.body.getReader();for(;;){const {done,value}=await rd.read();if(done)break;await f.write(value)}}finally{await f.close()}await fs.rename(t,o)}
const res=[];for(const it of m.files||[]){const d=path.resolve(it.dest);try{await dl(it.url,d);if(it.sha256&&(await sha(d))!==it.sha256)throw new Error("sha mismatch "+it.dest);res.push({dest:it.dest,ok:true})}catch(e){res.push({dest:it.dest,ok:false,error:String(e)})}}
await fs.mkdir("backups",{recursive:true});await fs.writeFile("backups/assets_fetch_result.json",JSON.stringify(res,null,2))
