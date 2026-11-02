// Ambient Home's Settings reach Helper through launch parameters: status, switching, starting a stopped Helper,
// forwarding to a running controller, timeouts and validation.
const assert=require('node:assert/strict');
const create=require('../app/home-bridge');
const root='/media/developer/apps/usr/palm/applications/com.local.nativehome',data=root+'/state';
const ID='0123456789abcdef0123456789abcdef';
function setup(files){
 let now=1000;const timers=[],launches=[],codes=[];let starts=0;
 const fs={
  statSync(p){if(!files.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return{};},
  readFileSync(p){if(!files.has(p))throw Object.assign(Error('missing'),{code:'ENOENT'});return files.get(p);},
  writeFileSync(p,t,o){assert.equal(o.mode,432);files.set(p,t);},
  chmodSync(p,m){assert.equal(m,432);assert.ok(files.has(p));},
  renameSync(a,b){files.set(b,files.get(a));files.delete(a);}
 };
 const t={files,launches,codes,
  bridge:create({fs,data,root,now:()=>now,later:(f,ms)=>timers.push({f,at:now+ms}),start:()=>{starts++;if(t.onStart)t.onStart();},launch:(id,p,done)=>{launches.push({id,p});done(true);}}),
  get starts(){return starts;},
  // Runs timers in order until none is left or the time limit passes.
  advance(ms){const end=now+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();now=next.at;next.f();}now=end;},
  ask(request){t.bridge(request,c=>codes.push(c));},
  reply(){assert.equal(launches.length,1,'exactly one answer');assert.equal(launches[0].id,'com.local.ambienthome');return launches[0].p.homeReply;}
 };
 return t;
}
const run=f=>{f.set(data+'/controller.pid','4321');f.set('/proc/4321/cmdline','node\0'+root+'/native.js\0');};

// Status while stopped by three Home presses.
let t=setup(new Map([[data+'/blocked','stopped'],[data+'/home-control.json','{"enabled":true}']]));
t.ask({id:ID,method:'homeStatus'});
assert.deepEqual(t.reply(),{running:false,blocked:true,enabled:true,id:ID,returnValue:true});assert.deepEqual(t.codes,[0]);assert.equal(t.starts,0);

// Status while running; a stale PID that belongs to another process is not Helper.
t=setup(new Map([[data+'/home-control.json','{"enabled":false}']]));run(t.files);
t.ask({id:ID,method:'homeStatus'});assert.equal(t.reply().running,true);assert.equal(t.reply().enabled,false);
t=setup(new Map([[data+'/controller.pid','4321'],['/proc/4321/cmdline','sh\0']]));
t.ask({id:ID,method:'homeStatus'});assert.equal(t.reply().running,false);assert.equal(t.reply().enabled,true,'no saved choice means Ambient Home');

// This home screen while stopped: save the choice, start the controller once, answer once it runs.
t=setup(new Map([[data+'/blocked','stopped'],[data+'/home-control.json','{"enabled":false}']]));
t.onStart=()=>{run(t.files);t.files.delete(data+'/blocked');};
t.ask({id:ID,method:'setHomeControl',enabled:true});
assert.equal(t.files.get(data+'/home-control.json'),'{"enabled":true}');assert.equal(t.starts,1);
t.advance(250);
assert.deepEqual(t.reply(),{running:true,blocked:false,enabled:true,id:ID,returnValue:true});assert.deepEqual(t.codes,[0]);

// ... and a controller that never starts is reported after 10 seconds, not before.
t=setup(new Map([[data+'/blocked','stopped']]));
t.ask({id:ID,method:'setHomeControl',enabled:true});t.advance(9900);assert.equal(t.launches.length,0);
t.advance(400);assert.equal(t.reply().returnValue,false);assert.equal(t.reply().errorText,'Home Helper did not start');assert.equal(t.reply().blocked,true);

// LG Home while stopped: only the saved choice changes; Helper is not started.
t=setup(new Map([[data+'/blocked','stopped']]));
t.ask({id:ID,method:'setHomeControl',enabled:false});
assert.equal(t.starts,0);assert.equal(t.files.get(data+'/home-control.json'),'{"enabled":false}');
assert.deepEqual(t.reply(),{running:false,blocked:true,enabled:false,id:ID,returnValue:true});

// Running controller: the request goes through its files; an old answer with another ID never counts.
t=setup(new Map([[data+'/home-control.json','{"enabled":true}'],[data+'/home-response.json','{"id":"ffffffffffffffffffffffffffffffff","returnValue":true}']]));run(t.files);
t.ask({id:ID,method:'setHomeControl',enabled:false});
const request=JSON.parse(t.files.get(data+'/home-request.json'));
assert.deepEqual(request,{id:ID,method:'setHomeControl',enabled:false,expires:6000});assert.equal(t.starts,0);
t.advance(300);assert.equal(t.launches.length,0,'waits for its own answer');
t.files.set(data+'/home-control.json','{"enabled":false}');t.files.set(data+'/home-response.json',JSON.stringify({id:ID,returnValue:true,enabled:false}));
t.advance(100);assert.deepEqual(t.reply(),{running:true,blocked:false,enabled:false,id:ID,returnValue:true});

// ... and a controller that does not answer within 5 seconds is reported.
t=setup(new Map());run(t.files);
t.ask({id:ID,method:'setHomeControl',enabled:true});t.advance(5100);
assert.equal(t.reply().returnValue,false);assert.equal(t.reply().errorText,'Home Helper did not respond');

// Open LG Home once: through a running controller, else directly. Never answered: that would open Ambient Home.
t=setup(new Map());run(t.files);
t.ask({id:ID,method:'openLGHome'});assert.equal(JSON.parse(t.files.get(data+'/home-request.json')).method,'openLGHome');
t.files.set(data+'/home-response.json',JSON.stringify({id:ID,returnValue:true}));t.advance(100);
assert.equal(t.launches.length,0);assert.deepEqual(t.codes,[0]);
t=setup(new Map([[data+'/blocked','stopped']]));
t.ask({id:ID,method:'openLGHome'});assert.deepEqual(t.launches,[{id:'com.webos.app.home',p:null}]);assert.equal(t.files.has(data+'/home-request.json'),false);

// Validation: a bad ID gets no answer at all; bad methods and values are refused without changing anything.
for(const bad of [null,'x',{},{id:'short',method:'homeStatus'},{id:ID.toUpperCase(),method:'homeStatus'}]){
 t=setup(new Map([[data+'/blocked','stopped']]));t.ask(bad);assert.equal(t.launches.length,0);assert.deepEqual(t.codes,[1]);
}
for(const bad of [{id:ID,method:'setHomeControl',enabled:'true'},{id:ID,method:'setHomeControl'},{id:ID,method:'shell'}]){
 t=setup(new Map([[data+'/blocked','stopped']]));t.ask(bad);
 assert.equal(t.reply().returnValue,false);assert.equal(t.reply().errorText,'Invalid Home request');
 assert.equal(t.starts,0);assert.deepEqual([...t.files.keys()],[data+'/blocked']);
}
console.log('PASS Home bridge: status, start when stopped, LG Home, running controller, timeouts and validation');
