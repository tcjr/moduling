// TODO: build this config for dev / release
var dojoConfig = {
  async: 0,
  baseUrl: ".",
  packages:[
    { name: 'put-selector', location: '/jsmodules/put-selector/lib' },
    { name: 'dojo', location: '/jsmodules/dojo-1.7.0/lib' },
    { name: 'handlebars', location: '/jsmodules/dojo-handlebars/lib' },
    { name: 'dijit', location: '/jsmodules/dijit-1.7.0/lib' },
    { name: 'xstyle', location: '/jsmodules/xstyle/lib' },
    { name: 'dojox', location: '/jsmodules/dojox-1.7.0/lib' },
    { name: 'dgrid', location: '/jsmodules/dgrid/lib' },
    { name: 'couch', location: '/jsmodules/dojocouch/lib' },
    // This one is in the "current" design doc, so we will get it from the attachments dir
    { name: 'mycouch', location: 'js/mycouch' },
    { name: 'chicago', location: 'js/chicago' }
  ]
};
