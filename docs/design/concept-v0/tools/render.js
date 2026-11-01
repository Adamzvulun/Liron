// usage: node render.js in.dc.html out.png [w h]
const fs=require('fs');const {chromium}=require('playwright');
(async()=>{const [inp,out,w='1920',h='1080']=process.argv.slice(2);
let s=fs.readFileSync(inp,'utf8');
s=s.replace(/<script src="\.\/support\.js"><\/script>/,'').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'')
 .replace(/<\/?helmet>/g,'').replace(/<\/?x-dc>/g,'').replace(/\{\{rootClass\}\}/g,'').replace(/\{\{[^}]*\}\}/g,'');
const tmp=out+'.html';fs.writeFileSync(tmp,s);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h}});
await p.goto('file://'+require('path').resolve(tmp),{waitUntil:'load',timeout:15000}).catch(e=>console.log('load',e.message));
await p.addStyleTag({content:'*{animation:none!important}'});
await p.waitForTimeout(300);await p.screenshot({path:out});await b.close();})();
