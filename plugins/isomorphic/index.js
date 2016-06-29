var Module = require('module');
var frontendCache = {};
var frontendFactoryCache = {};
var debuglog = require('debuglog')('yog/isomorphic');

module.exports.isomorphic = ['views', function (app, conf) {
    global.define = function (id, factory) {
        debuglog('isomorphic script', id, 'loaded');
        frontendFactoryCache['frontend_' + id] = factory;
    };

    function getDeps(id) {
        let deps = [];
        var info = app.fis.getInfo(id);
        if (!info) {
            return deps;
        }
        if (info.deps) {
            info.deps.forEach(dep => {
                deps = deps.concat(getDeps(dep));
            });
        }
        if (info.type === 'js') {
            if (!info.subpath) {
                throw new Error('Please update your yog2 cli version to support isomorphic mode.');
            }
            deps.push(info.subpath);
        }
        return deps;
    }

    var originModuleLoad = Module._load.bind(Module);

    Module._load = function (request, parent, isMain) {
        if (request.indexOf(':') === -1) {
            return originModuleLoad(request, parent, isMain);
        }
        if (!frontendFactoryCache['frontend_' + request]) {
            getDeps(request).forEach(dep => {
                debuglog('require isomorphic script from', dep);
                require(yog.ROOT_PATH + dep);
            });
        }
        if (frontendCache['frontend_' + request]) {
            return frontendCache['frontend_' + request].exports;
        }
        if (frontendFactoryCache['frontend_' + request]) {
            var module = {};
            module.exports = {};
            var factory = frontendFactoryCache['frontend_' + request];
            factory(require, module.exports, module);
            frontendCache['frontend_' + request] = module;
            return module.exports;
        }
        return originModuleLoad(request, parent, isMain);
    };

    return {
        cleanCache: function () {
            frontendCache = {};
            frontendFactoryCache = {};
        }
    };
}];
