'use strict';
// The tile is informational. Only boot callbacks and an explicit UI action start
// the controller; opening Helper must never clear an emergency-stop latch.
var root='/media/developer/apps/usr/palm/applications/com.local.nativehome';
var params;try{params=JSON.parse(process.argv[2]||'{}');}catch(_){params={};}
var cp=require('child_process');
function start(automatic){
 var child=cp.spawn(root+'/detach',[JSON.stringify({nativeHomeAuto:automatic}),'--controller'],{detached:true,stdio:'ignore'});
 child.on('error',function(){process.exit(1);});child.unref();
}
// Anonymous public-bus caller: the controller already owns the app LS2 name.
function launch(id,launchParams,done){
 var request={id:id};if(launchParams)request.params=launchParams;
 cp.execFile('/usr/bin/luna-send-pub',['-n','1','luna://com.webos.applicationManager/launch',JSON.stringify(request)],{timeout:5000},function(error){done(!error);});
}
if(params.nativeHomeAuto===true||params.nativeHomeStart===true)start(params.nativeHomeAuto===true);
// A home screen's Settings (see home-bridge.js).
else if(params.homeRequest!==undefined)require('./home-bridge')({fs:require('fs'),data:root+'/state',root:root,start:function(){start(false);},launch:launch})(params.homeRequest,function(code){process.exit(code);});
// The tile shows the Home settings of the chosen home screen, or Ambient Home's if that one cannot be opened.
else (function(){
 var choice=require('./home-choice'),home=choice.read(require('fs'),root+'/state').launcher;
 launch(home,{showHelper:true},function(ok){
  if(ok||home===choice.AMBIENT){process.exit(ok?0:1);return;}
  launch(choice.AMBIENT,{showHelper:true},function(again){process.exit(again?0:1);});
 });
})();
