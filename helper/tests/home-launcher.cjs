// Home can open another home screen of yours: which ids count, the saved choice, the Settings bridge answering the
// home screen that asked, the screen and resume policies, and the real controller opening the chosen home screen.
const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),EventEmitter=require('events');
const choice=require('../app/home-choice'),createControl=require('../app/home-control'),createBridge=require('../app/home-bridge');
const makeScreen=require('../app/screen-policy'),shouldLaunch=require('../app/resume-policy');
const AMBIENT='com.local.ambienthome',OTHER='com.local.otherhome',LG='com.webos.app.home',APP='com.example.video';

// Ids: only your own Developer Mode apps, never Helper itself.
for(const id of [AMBIENT,OTHER,'com.local.a1'])assert.equal(choice.valid(id),true,id);
for(const id of ['com.local.nativehome',LG,'com.local.','com.local.Oni','com.local.oni-home','com.local.oni.x',null,42,'com.local.'+'a'.repeat(41)])assert.equal(choice.valid(id),false,String(id));
assert.equal(choice.AMBIENT,AMBIENT);

// Lenient reading: anything missing or broken means Ambient Home, on.
const fixed=text=>({readFileSync(){if(text===null)throw Object.assign(Error('missing'),{code:'ENOENT'});return text;}});
const DEFAULT={enabled:true,launcher:AMBIENT};
assert.deepEqual(choice.read(fixed(null),'/d'),DEFAULT);
assert.deepEqual(choice.read(fixed('{"enabled":false}'),'/d'),{enabled:false,launcher:AMBIENT});
assert.deepEqual(choice.read(fixed('{"enabled":true,"launcher":"com.local.otherhome"}'),'/d'),{enabled:true,launcher:OTHER});
assert.deepEqual(choice.read(fixed('{"launcher":"com.webos.app.browser"}'),'/d'),DEFAULT);
assert.deepEqual(choice.read(fixed('null'),'/d'),DEFAULT);
assert.deepEqual(choice.read(fixed('garbage'),'/d'),DEFAULT);
console.log('PASS home screen ids and lenient reading');

// The controller's saved choice, in a real folder.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'home-launcher-'));
try{
 const file=path.join(dir,'home-control.json'),applied=[];
 const c=createControl(fs,dir,v=>applied.push(v),()=>{});
 assert.equal(c.launcher(),AMBIENT);
 assert.deepEqual(c.set(true,OTHER),{enabled:true,launcher:OTHER});assert.deepEqual(applied,[true]);
 assert.equal(fs.readFileSync(file,'utf8'),'{"enabled":true,"launcher":"com.local.otherhome"}');
 assert.equal(createControl(fs,dir,()=>{},()=>{}).launcher(),OTHER,'kept across restarts');
 c.set(false);assert.equal(fs.readFileSync(file,'utf8'),'{"enabled":false,"launcher":"com.local.otherhome"}','LG Home keeps the home screen');
 assert.throws(()=>c.set(true,LG));assert.throws(()=>c.set(true,'com.local.nativehome'));
 assert.equal(fs.readFileSync(file,'utf8'),'{"enabled":false,"launcher":"com.local.otherhome"}');assert.equal(c.launcher(),OTHER);
 fs.writeFileSync(file,'garbage');assert.throws(()=>createControl(fs,dir,()=>{},()=>{}),'a broken choice stops the controller, as before');
 console.log('PASS saved home screen: kept, kept by LG Home, refused when not yours');
}finally{fs.rmSync(dir,{recursive:true});}

// The Settings bridge (same harness as home-bridge.cjs).
const root='/media/developer/apps/usr/palm/applications/com.local.nativehome',data=root+'/state',ID='0123456789abcdef0123456789abcdef';
function setup(files){
 let now=1000;const timers=[],launches=[],codes=[];let starts=0;
 const fake={
  statSync(p){if(!files.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return{};},
  readFileSync(p){if(!files.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return files.get(p);},
  writeFileSync(p,t){files.set(p,t);},chmodSync(){},
  renameSync(a,b){files.set(b,files.get(a));files.delete(a);}
 };
 const t={files,launches,codes,
  bridge:createBridge({fs:fake,data,root,now:()=>now,later:(f,ms)=>timers.push({f,at:now+ms}),start:()=>{starts++;},launch:(id,p,done)=>{launches.push({id,p});done(true);}}),
  get starts(){return starts;},
  advance(ms){const end=now+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();now=next.at;next.f();}now=end;},
  ask(request){t.bridge(request,c=>codes.push(c));}
 };
 return t;
}
const run=f=>{f.set(data+'/controller.pid','4321');f.set('/proc/4321/cmdline','node\0'+root+'/native.js\0');};
const saved=data+'/home-control.json';

// The answer goes to the home screen that asked, and says which home screen Home opens.
let t=setup(new Map([[saved,'{"enabled":true,"launcher":"com.local.otherhome"}']]));
t.ask({id:ID,method:'homeStatus',from:OTHER});
assert.equal(t.launches.length,1);assert.equal(t.launches[0].id,OTHER);
assert.deepEqual(t.launches[0].p.homeReply,{running:false,blocked:false,enabled:true,launcher:OTHER,id:ID,returnValue:true});assert.deepEqual(t.codes,[0]);
// Without a sender (Ambient Home before this change) the answer goes to Ambient Home.
t=setup(new Map());t.ask({id:ID,method:'homeStatus'});assert.equal(t.launches[0].id,AMBIENT);assert.equal(t.launches[0].p.homeReply.launcher,AMBIENT);
// An unknown sender gets nothing: there is no one to answer.
for(const from of [LG,'com.local.nativehome',7,'']){t=setup(new Map());t.ask({id:ID,method:'homeStatus',from});assert.equal(t.launches.length,0,String(from));assert.deepEqual(t.codes,[1]);}

// Switching while stopped: saved, Helper started, answered once it runs.
t=setup(new Map());
t.ask({id:ID,method:'setHomeControl',enabled:true,launcher:OTHER,from:OTHER});
assert.equal(t.files.get(saved),'{"enabled":true,"launcher":"com.local.otherhome"}');assert.equal(t.starts,1);
run(t.files);t.advance(250);
assert.equal(t.launches.length,1);assert.equal(t.launches[0].id,OTHER);
assert.equal(t.launches[0].p.homeReply.launcher,OTHER);assert.equal(t.launches[0].p.homeReply.returnValue,true);assert.equal(t.launches[0].p.homeReply.running,true);

// LG Home keeps the saved home screen for next time.
t=setup(new Map([[saved,'{"enabled":true,"launcher":"com.local.otherhome"}']]));
t.ask({id:ID,method:'setHomeControl',enabled:false});
assert.equal(t.files.get(saved),'{"enabled":false,"launcher":"com.local.otherhome"}');assert.equal(t.starts,0);
assert.equal(t.launches[0].id,AMBIENT);assert.equal(t.launches[0].p.homeReply.enabled,false);assert.equal(t.launches[0].p.homeReply.launcher,OTHER);

// Older Ambient Home builds turn Home on without naming a home screen: that means Ambient Home, also when running.
t=setup(new Map([[saved,'{"enabled":false,"launcher":"com.local.otherhome"}']]));
t.ask({id:ID,method:'setHomeControl',enabled:true});
assert.equal(t.files.get(saved),'{"enabled":true,"launcher":"com.local.ambienthome"}');assert.equal(t.starts,1);
t=setup(new Map());run(t.files);t.ask({id:ID,method:'setHomeControl',enabled:true,from:OTHER});
assert.equal(JSON.parse(t.files.get(data+'/home-request.json')).launcher,OTHER,'a sender that names none means itself');
// A home screen that is not yours is refused, and nothing changes.
for(const launcher of ['com.webos.app.browser','com.local.nativehome',null]){
 t=setup(new Map());t.ask({id:ID,method:'setHomeControl',enabled:true,launcher,from:OTHER});
 assert.equal(t.launches[0].id,OTHER);assert.equal(t.launches[0].p.homeReply.returnValue,false);assert.equal(t.launches[0].p.homeReply.errorText,'Invalid Home request');
 assert.equal(t.starts,0);assert.equal(t.files.has(saved),false);
}

// A running controller gets the home screen in its request; the answer goes to the sender.
t=setup(new Map());run(t.files);
t.ask({id:ID,method:'setHomeControl',enabled:true,launcher:OTHER,from:OTHER});
assert.deepEqual(JSON.parse(t.files.get(data+'/home-request.json')),{id:ID,method:'setHomeControl',enabled:true,launcher:OTHER,expires:6000});
t.files.set(data+'/home-response.json',JSON.stringify({id:ID,returnValue:true}));t.advance(100);
assert.equal(t.launches.length,1);assert.equal(t.launches[0].id,OTHER);
// openLGHome from another home screen still goes through the controller and is never answered.
t=setup(new Map());run(t.files);t.ask({id:ID,method:'openLGHome',from:OTHER});
assert.equal(JSON.parse(t.files.get(data+'/home-request.json')).method,'openLGHome');
t.files.set(data+'/home-response.json',JSON.stringify({id:ID,returnValue:true}));t.advance(100);assert.equal(t.launches.length,0);
console.log('PASS bridge: answers the sender, switches and keeps the home screen, refuses others');

// Screen policy: leaving the chosen home screen never bounces back to it; another home screen is an ordinary app.
let p=makeScreen([APP,OTHER],id=>id===OTHER);
p.next(OTHER,0);assert.equal(p.next(LG,100),false,'the chosen home screen closing stays in LG Home');
p.next(APP,200);assert.equal(p.next(LG,300),true);
p=makeScreen([APP,AMBIENT]);p.next(AMBIENT,0);assert.equal(p.next(LG,100),false,'Ambient Home by default');
p=makeScreen([APP,AMBIENT],id=>id===OTHER);p.next(AMBIENT,0);assert.equal(p.next(LG,100),true);
// A long Back is forgotten when the chosen home screen comes up, as for Ambient Home before.
p=makeScreen([APP],id=>id===OTHER);p.next(APP,0);p.back(true,100);p.back(false,1000);p.next(OTHER,1100);p.next(APP,1200);assert.equal(p.next(LG,1300),true);
// Resume: no duplicate launch of the home screen that is already back.
assert.equal(shouldLaunch(OTHER,OTHER),false);assert.equal(shouldLaunch(AMBIENT,OTHER),true);
assert.equal(shouldLaunch(AMBIENT),false);assert.equal(shouldLaunch(OTHER),true);
console.log('PASS screen and resume policies follow the chosen home screen');

// The real controller (harness from controller-home.cjs) with another home screen saved as the one Home opens.
function controller(savedChoice){
 let now=1000,worker,watch,start,tick;const calls=[],commands=[],files=new Map();
 if(savedChoice)files.set(saved,savedChoice);
 function Service(){this.register=()=>{};this.activityManager={create(){}};this.call=(uri,p,cb)=>{if(uri.endsWith('/launch'))calls.push(p.id);cb({payload:{returnValue:true,state:{enabled:true,schema:3}}});};}
 const fakefs={existsSync:()=>false,writeFileSync:(p,s)=>files.set(p,s),renameSync:(a,b)=>{files.set(b,files.get(a));files.delete(a);},chmodSync(){},unlinkSync(){},appendFileSync(){},
  readFileSync(p){if(p.endsWith('apps.json'))return JSON.stringify([APP,AMBIENT,OTHER]);if(files.has(p))return files.get(p);throw Object.assign(Error('missing'),{code:'ENOENT'});}};
 const context={Buffer,require(n){if(n==='./state-permissions')return()=>true;if(n==='fs')return fakefs;if(n==='child_process')return{spawn(){worker=new EventEmitter();worker.stdout=new EventEmitter();worker.stderr=new EventEmitter();worker.stdin=new EventEmitter();worker.stdin.write=c=>commands.push(c);worker.stdin.end=()=>{throw Error('worker must stay active');};return worker;}};if(n==='/usr/lib/node_modules/webos-service')return Service;if(n==='./screen-watch')return(d,l,fg,reset,power)=>{watch={fg,power};return{close(){}};};return require('../app/'+n.slice(2));},
  process:{argv:['node','app','{"nativeHomeAuto":true}'],pid:1,getuid:()=>5431,hrtime:()=>[Math.floor(now/1000),(now%1000)*1e6],on(){},exit(){throw Error('must not stop');}},
  setTimeout(fn,ms){if(ms===0)start=fn;return 1;},clearTimeout(){},setInterval(fn){tick=fn;},clearInterval(){}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../app/native.js','utf8'),context);
 let seq=0;
 const c={calls,commands,files,start(){start();worker.stdout.emit('data',Buffer.from('READY\n'));},fg:id=>watch.fg(id),press:line=>worker.stdout.emit('data',Buffer.from(line+'\n')),
  rpc(method,p={}){files.set(data+'/home-request.json',JSON.stringify({id:(++seq).toString(16).padStart(32,'0'),method,enabled:p.enabled,launcher:p.launcher,expires:Date.now()+5000}));tick();return JSON.parse(files.get(data+'/home-response.json'));}};
 return c;
}
// Boot: the saved home screen opens first, then Home opens it again.
let k=controller('{"enabled":true,"launcher":"com.local.otherhome"}');k.start();
assert.deepEqual(k.calls,[OTHER],'the boot launch opens the saved home screen');
assert.deepEqual(k.rpc('homeStatus'),{returnValue:true,enabled:true,launcher:OTHER,id:'00000000000000000000000000000001'});
k.fg(OTHER);k.press('HOME');assert.equal(k.calls.at(-1),OTHER);
// Leaving an app returns to the chosen home screen; Ambient Home is an ordinary app now.
k.fg(APP);k.fg(LG);assert.equal(k.calls.at(-1),OTHER);
let before=k.calls.length;k.fg(AMBIENT);k.fg(LG);assert.equal(k.calls.length,before+1);assert.equal(k.calls.at(-1),OTHER);
// The chosen home screen closing never bounces back to it.
before=k.calls.length;k.fg(OTHER);k.fg(LG);assert.equal(k.calls.length,before);
// Switch to Ambient Home while running: Home follows at once, and the relay keeps Home.
assert.deepEqual(k.rpc('setHomeControl',{enabled:true,launcher:AMBIENT}),{returnValue:true,enabled:true,launcher:AMBIENT,id:'00000000000000000000000000000002'});
assert.equal(k.commands.filter(c=>c!=='P').at(-1),'E');assert.equal(k.files.get(saved),'{"enabled":true,"launcher":"com.local.ambienthome"}');
k.press('HOME');assert.equal(k.calls.at(-1),AMBIENT);
// LG Home keeps the home screen; turning Home back on without naming one keeps it too.
assert.equal(k.rpc('setHomeControl',{enabled:false}).launcher,AMBIENT);assert.equal(k.commands.filter(c=>c!=='P').at(-1),'D');
before=k.calls.length;k.press('HOME');assert.equal(k.calls.length,before,'Home is LG\'s while switched off');
assert.equal(k.rpc('setHomeControl',{enabled:true}).launcher,AMBIENT);
// A home screen that is not yours is refused and changes nothing.
const refused=k.rpc('setHomeControl',{enabled:true,launcher:'com.webos.app.browser'});
assert.equal(refused.returnValue,false);assert.equal(k.files.get(saved),'{"enabled":true,"launcher":"com.local.ambienthome"}');
// No saved choice at all: Ambient Home, as before.
k=controller(null);k.start();assert.deepEqual(k.calls,[AMBIENT]);
console.log('PASS real controller: boots into, returns to and switches the chosen home screen');
console.log('PASS Home screen choice: ids, saved file, bridge routing, screen policy, resume, controller');
