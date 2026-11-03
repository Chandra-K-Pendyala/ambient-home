'use strict';
// The routing preference is separate from the emergency-stop latch and profile. It also names the home screen that
// Home opens (home-choice.js); a choice that names none keeps the saved home screen.
var choice=require('./home-choice');
module.exports=function(fs,data,apply,visit){
 var path=data+'/home-control.json',enabled=true,launcher=choice.AMBIENT;
 try{var saved=JSON.parse(fs.readFileSync(path,'utf8'));enabled=saved.enabled!==false;if(choice.valid(saved.launcher))launcher=saved.launcher;}catch(e){if(e.code!=='ENOENT')throw e;}
 return {
  enabled:function(){return enabled;},
  launcher:function(){return launcher;},
  set:function(value,home){
   if(typeof value!=='boolean')throw Error('Expected enabled boolean');
   if(home!==undefined&&!choice.valid(home))throw Error('Expected a home screen app id');
   var next=home===undefined?launcher:home;
   fs.writeFileSync(path+'.tmp',JSON.stringify({enabled:value,launcher:next}),{mode:432});
   fs.renameSync(path+'.tmp',path);enabled=value;launcher=next;apply(enabled);return {enabled:enabled,launcher:launcher};
  },
  visit:function(){return visit();}
 };
};
