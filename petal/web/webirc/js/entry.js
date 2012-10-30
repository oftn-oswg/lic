var shoe = require('shoe');
var dnode = require('dnode');

var domready = require('domready');

domready(function () {
    var result = document.getElementById('result');
    var stream = shoe('/dnode');
    
    var d = dnode();
    d.on('remote', function (remote) {
        remote.register("webirc", function shutdown(c) {
            console.log('server shutting down');
            c();
        }, function(handle, unregister) {
            console.log(handle);
        });

        console.log(remote);
    });
    d.pipe(stream).pipe(d);
});
