
var jsgi        = require('jsgi/jsgi-node'),
    promise     = require('promised-io/promise'),
    fs          = require('fs'),
    daemon      = require("daemon"),
    http        = require('http'),
    net_binding = process.binding('net');

var WebAppContext = function (webapp) {
    this.server = http.createServer(new jsgi.Listener(function (request) {
        return webapp.handle(request);
    }));
    this._beforeStart = [];
};

WebAppContext.prototype.beforeStart = function (promise) {
    this._beforeStart.push(promise);
};

var newApplied = {};

exports.framework = function (proto) {
    return function () {
        if (! (this instanceof arguments.callee)) {
            return new arguments.callee(newApplied, arguments);
        }
        this.context = new WebAppContext(this);
        if (arguments[0] === newApplied) {
            proto.apply(this, arguments[1]);
        }
        else {
            proto.apply(this, arguments);
        }
    };
};

function extractStack (stack) {
    var frames = stack.split(/\n\s*/);
    frames.shift(); // message
    return frames.map(function (frame) {
        var match = frame.match(/^at (.+) \((.+?):(\d+):(\d+)\)$/) || frame.match(/^at ()(.+?):(\d+):(\d+)$/);
        if (! match) {
            throw new Error('could not extract data from stack frame: ' + frame);
        }
        return {
            func: match[1],
            file: match[2],
            line: match[3],
            char: match[4]
        };
    });
}

function formatStack (stack) {
    var result = 'Stack trace:\n';

    for (var i = 0, ilen = stack.length; i < ilen; i++) {
        var frame = stack[i];
        result += '    ' + frame.file + ' line ' + frame.line + ', char ' + frame.char + ' (' + frame.func + ')\n';
    }

    return result;
}

function decorateError (run, handler, invocant) {
    return function () {
        try {
            return run.apply(this, arguments);
        }
        catch (e) {
            var message = exports.errorMessage(e);
            e.toString = function () {
                return message;
            };
            if (handler) {
                handler.call(invocant, e);
            }
            else {
                throw e;
            }
        }
    };
};

exports.errorMessage = function (e) {
     var stack = extractStack(e.stack);
     return e + '\n' +
            '    at ' + stack[0].file + ' line ' + stack[0].line + ', char ' + stack[0].char + '\n' + 
            '    (' + stack[0].func + ')\n' +
            '\n' + formatStack(stack);
};

var Server = exports.Server = function (webapp, options) {
    this._webapp    = webapp;
    this._port      = options.port || 80;
    this._bindTo    = options.bindTo || '0.0.0.0';
    this._pidfile   = options.pidfile;
    this._daemonise = options.daemonise;
    this._uid       = options.uid;
    this._gid       = options.gid;
    this._logdir    = options.logdir;
    this._slave     = options.slave;
    this._reload    = ! options.noreload;
    this._onError   = options.onError;
};

Server.prototype._becomeDaemon = function () {
    var pid = daemon.start();
    daemon.lock(this._pidfile);
    if (this._uid && this._gid) {
        process.setgid(this._gid);
        process.setuid(this._uid);
    }
    daemon.closeIO();
    // these work because they are in the right order after closeIO
    this._stdin  = fs.openSync('/dev/null', 'r');
    if (this._logdir) {
        this._stdout = fs.openSync(this._logdir + '/log', 'a');
        this._stderr = fs.openSync(this._logdir + '/errors', 'a');
    }
    else {
        this._stdout = fs.openSync('/dev/null', 'a');
        this._stderr = fs.openSync('/dev/null', 'a');
    }
    process.umask(027);
    process.chdir('/');
}

Server.prototype.runSlave = decorateError(function () {
    return promise.all(server._webapp.context._beforeStart).then(decorateError(
        function () {
            server._webapp.context.server.listen(server._port || 80, server._bindTo);
        },
        server._onError
    ));
});

Server.prototype.run = decorateError(function (nodePath, args) {
    this._listenFd = net_binding.socket('tcp4');
    net_binding.bind(this._listenFd, this._port, this._bindTo);

    if (this._daemonise) {
        this._becomeDaemon();
    }

    var server  = this,
        promise = new promise.Promise();

    process.nextTick(function () {
        net_binding.listen(listen_fd, 128);
        if (server._reload) {
            server._startForkingServer(nodePath, args);
        }
        else {
            server._startPreForkServer(nodePath, args);
        }
        promise.resolve(server._bindTo + ':' + server._port);
    });
    return promise;
});

Server.prototype._startForkingServer = function () {
    var connection = 
};

Server.prototype._startPreForkServer = function () {

};

Server.prototype._startChild = function () {
    
};


