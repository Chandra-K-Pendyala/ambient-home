'use strict';
// Ambient Home's own service: the Home on/off bridge from upstream's launcher service (renewal-service/service.js),
// without the Developer Mode renewal. It talks to Home Helper only through files in Helper's shared data folder.
var fs=require('fs'),Service=require('webos-service'),diagnostics=require('./diagnostics');
var service=new Service('com.local.ambienthome.service');
var helper='/media/developer/apps/usr/palm/applications/com.local.nativehome',state=helper+'/state';
function caller(m){var raw=m.ls2Message,id=raw&&raw.applicationID&&raw.applicationID();return typeof id==='string'&&id.split(' ')[0]==='com.local.ambienthome';}
function denied(m){m.respond({returnValue:false,errorText:'caller-not-authorized',diagnostic:diagnostics.describe('home','authorize',{code:'CALLER_DENIED'})});}

var homeControl=require('./home-control')(fs,state);
['homeStatus','setHomeControl','openLGHome'].forEach(function(method){
 service.register(method,function(m){
  if(!caller(m)){denied(m);return;}
  homeControl(method,m.payload).then(function(r){m.respond(r);});
 });
});

// Answers at once whether Helper is installed, stopped for safety (Home pressed three times) or running,
// so the settings sheet need not wait for homeStatus to time out. Same checks as Helper's own status method.
function exists(p){try{fs.statSync(p);return true;}catch(e){return e.code!=='ENOENT';}}
function running(){try{var pid=fs.readFileSync(state+'/controller.pid','utf8').trim();
 if(!/^[1-9][0-9]*$/.test(pid))return false;
 var args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');
 return args[0]==='com.local.nativehome'||args.indexOf(helper+'/native.js')>=0;}catch(_){return false;}}
service.register('helperStatus',function(m){
 if(!caller(m)){denied(m);return;}
 m.respond({returnValue:true,installed:exists(helper+'/appinfo.json'),blocked:exists(state+'/blocked'),running:running()});
});
