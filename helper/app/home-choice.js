'use strict';
// Which home screen the Home button opens: Ambient Home, unless Settings chose another home screen app of your own
// (installed in Developer Mode, with an id com.local.<name>; never Helper itself). Saved with the on/off choice in
// home-control.json as {enabled,launcher}; enabled false means LG Home.
var AMBIENT='com.local.ambienthome';
exports.AMBIENT=AMBIENT;
exports.valid=function(id){return typeof id==='string'&&/^com\.local\.[a-z0-9]{1,40}$/.test(id)&&id!=='com.local.nativehome';};
// The saved choice for readers that must never fail: a missing or unreadable file means Ambient Home, on.
exports.read=function(fs,data){
 try{var s=JSON.parse(fs.readFileSync(data+'/home-control.json','utf8'));return {enabled:s.enabled!==false,launcher:exports.valid(s.launcher)?s.launcher:AMBIENT};}
 catch(_){return {enabled:true,launcher:AMBIENT};}
};
