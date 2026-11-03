'use strict';
// A duplicate launch while cpcover finishes restoring the foreground app can
// disturb activation. Let an already restored launcher keep its current window.
// launcher: the home screen Home opens (Ambient Home when not given).
module.exports=function(foreground,launcher){return foreground!==(launcher||'com.local.ambienthome');};
