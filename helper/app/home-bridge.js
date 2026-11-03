'use strict';
// A home screen's Settings ask Helper where the Home button goes, and switch it. webOS keeps each app's files and
// services to itself, so the home screen opens Helper with {homeRequest:{id,method,enabled,launcher,from}} and Helper
// answers by opening that home screen (from; Ambient Home when it does not say) with
// {homeReply:{id,returnValue,running,blocked,enabled,launcher}}. launcher is the home screen Home opens
// (home-choice.js); turning Home off keeps the saved one. A running controller gets the request through its own
// files, home-request.json, and answers in home-response.json.
// Choosing a home screen in Settings is an explicit UI action, so it may start a stopped controller, which ends the
// stop from pressing Home three times. Opening the Helper tile never does.
var choice=require('./home-choice');
module.exports=function(o){
 var fs=o.fs,data=o.data,now=o.now||Date.now,later=o.later||setTimeout;
 function exists(name){try{fs.statSync(data+'/'+name);return true;}catch(e){return e.code!=='ENOENT';}}
 // The controller's own process only: never a stale ID, nor the relay. Same check as the service's status.
 function running(){try{var pid=fs.readFileSync(data+'/controller.pid','utf8').trim();if(!/^[1-9][0-9]*$/.test(pid))return false;var args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');return args[0]==='com.local.nativehome'||args.indexOf(o.root+'/native.js')>=0;}catch(_){return false;}}
 // Like the controller's home-control.js: Ambient Home, on, unless the saved choice says otherwise.
 function state(){var c=choice.read(fs,data);return {running:running(),blocked:exists('blocked'),enabled:c.enabled,launcher:c.launcher};}
 function write(name,text){var tmp=data+'/'+name+'.tmp';fs.writeFileSync(tmp,text,{mode:432});fs.chmodSync(tmp,432);fs.renameSync(tmp,data+'/'+name);}
 function forward(request,done){
  var deadline=now()+5000;
  try{write('home-request.json',JSON.stringify({id:request.id,method:request.method,enabled:request.enabled,launcher:request.launcher,expires:deadline}));}catch(e){done(null);return;}
  (function poll(){
   var response=null;
   try{response=JSON.parse(fs.readFileSync(data+'/home-response.json','utf8'));}catch(_){}
   if(response&&response.id===request.id){done(response);return;}
   if(now()>=deadline){done(null);return;}
   later(poll,100);
  })();
 }
 return function(request,done){
  if(!request||typeof request!=='object'||typeof request.id!=='string'||!/^[a-f0-9]{32}$/.test(request.id)){done(1);return;}
  // The answer goes to the home screen that asked; with an unknown sender there is no one to answer.
  if(request.from!==undefined&&!choice.valid(request.from)){done(1);return;}
  var from=request.from===undefined?choice.AMBIENT:request.from;
  function answer(returnValue,errorText){
   var reply=state();reply.id=request.id;reply.returnValue=returnValue;if(errorText)reply.errorText=errorText;
   o.launch(from,{homeReply:reply},function(ok){done(ok?0:1);});
  }
  if(request.method==='homeStatus'){answer(true);return;}
  if(request.method==='setHomeControl'&&typeof request.enabled==='boolean'&&(request.launcher===undefined||choice.valid(request.launcher))){
   // Turning Home on without naming a home screen means the sender's own (older Ambient Home builds name none).
   if(request.enabled&&request.launcher===undefined)request={id:request.id,method:request.method,enabled:true,launcher:from,from:request.from};
   if(running()){forward(request,function(r){if(r)answer(r.returnValue===true,r.returnValue===true?null:'Home Helper refused the change');else answer(false,'Home Helper did not respond');});return;}
   var launcher=request.launcher===undefined?choice.read(fs,data).launcher:request.launcher;
   try{write('home-control.json',JSON.stringify({enabled:request.enabled,launcher:launcher}));}catch(e){answer(false,'Could not save the choice');return;}
   if(!request.enabled){answer(true);return;}
   // The controller reads the choice when it starts, removes the stop and opens the chosen home screen.
   o.start();
   var until=now()+10000;
   (function wait(){if(running()){answer(true);return;}if(now()>=until){answer(false,'Home Helper did not start');return;}later(wait,250);})();
   return;
  }
  if(request.method==='openLGHome'){
   if(running())forward(request,function(){done(0);});
   else o.launch('com.webos.app.home',null,function(ok){done(ok?0:1);});
   return;
  }
  answer(false,'Invalid Home request');
 };
};
