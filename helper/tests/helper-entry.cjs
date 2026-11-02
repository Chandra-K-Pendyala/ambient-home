// Manual launch must explain Helper without changing emergency state or starting input capture.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function run(params){
 const calls=[],spawns=[],bridged=[];let exit,options;
 const context={require(name){if(name==='child_process')return{execFile:(file,args,options,cb)=>{assert.equal(file,'/usr/bin/luna-send-pub');assert.equal(options.timeout,5000);calls.push({uri:args[2],p:JSON.parse(args[3])});cb(null);},spawn:(...args)=>{spawns.push(args);return{unref(){},on(){}};}};if(name==='/usr/lib/node_modules/webos-service')throw Error('manual entry must not register the running controller LS2 name');if(name==='fs')return{};if(name==='./home-bridge')return o=>{options=o;return(request,done)=>{bridged.push(request);done(0);};};throw Error(name);},process:{argv:['node','entry',JSON.stringify(params)],exit:c=>exit=c},setTimeout(){return 1;},clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../app/helper-entry.js','utf8'),context);
 return{calls,spawns,bridged,options,exit};
}
let r=run({});assert.equal(r.spawns.length,0);assert.equal(r.calls[0].p.id,'com.local.ambienthome');assert.equal(r.calls[0].p.params.showHelper,true);assert.equal(r.bridged.length,0);
r=run({nativeHomeAuto:true});assert.equal(r.calls.length,0);assert.equal(r.spawns.length,1);assert.equal(JSON.parse(r.spawns[0][1][0]).nativeHomeAuto,true);
r=run({nativeHomeStart:true});assert.equal(r.calls.length,0);assert.equal(JSON.parse(r.spawns[0][1][0]).nativeHomeAuto,false);
r=run({nativeHomeAuto:'true'});assert.equal(r.spawns.length,0,'only a boolean allows unattended start');
// Ambient Home's Settings: the request goes to the bridge, which may start the controller as an explicit UI action.
const request={id:'0123456789abcdef0123456789abcdef',method:'homeStatus'};
r=run({homeRequest:request});assert.equal(JSON.stringify(r.bridged),JSON.stringify([request]));assert.equal(r.spawns.length,0);assert.equal(r.calls.length,0);assert.equal(r.exit,0);
assert.equal(r.options.data,'/media/developer/apps/usr/palm/applications/com.local.nativehome/state');
r.options.start();assert.equal(r.spawns.length,1);assert.equal(JSON.stringify(r.spawns[0][1]),JSON.stringify(['{"nativeHomeAuto":false}','--controller']));
r.options.launch('com.local.ambienthome',{homeReply:{id:request.id}},ok=>assert.equal(ok,true));
assert.deepEqual(r.calls[0],{uri:'luna://com.webos.applicationManager/launch',p:{id:'com.local.ambienthome',params:{homeReply:{id:request.id}}}});
r.options.launch('com.webos.app.home',null,()=>{});assert.deepEqual(r.calls[1].p,{id:'com.webos.app.home'});
console.log('PASS Helper manual explanation, silent background launch, explicit restart and Settings requests');
