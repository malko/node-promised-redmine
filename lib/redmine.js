var querystring, D, utils, pkg;

querystring = require('querystring');
D = require('d.js');
utils = require('./utils');
pkg = require('../package.json');

/**
 *  Redmine
 */
function Redmine (config) {

    if (!config.apiKey || !config.host) {
        throw new Error('Error: apiKey and host must be configured.');
    }

    defineGettersAndSetters.call(this, config);

    return this;
}

function defineGettersAndSetters(config) {

    this.__defineGetter__('version', function() {
        return pkg.version;
    });

    this.__defineGetter__('apiKey', function() {
        return config.apiKey;
    });

    this.__defineGetter__('rootPath', function() {
        var path = config.rootPath;
        return path ? ( path[0] === '/' ? path : '/' + path  ) : '';
    });

    this.__defineGetter__('host', function() {
        return config.host;
    });

    this.__defineGetter__('basicAuth', function() {
        return config.basicAuth || '';
    });

    this.__defineGetter__('protocol', function() {

        if (!config.protocol.match(/^https?/)) {
            throw new Error('Protocol must be one of http, https');
        }

        return config.protocol;
    });

    this.__defineGetter__('transport', function() {
        var protocol;

        if ( config.protocol != null && !config.protocol.match(/^https?/)) {
            throw new Error('Protocol must be one of http, https');
        }

        protocol = config.protocol || 'http';

        return require(protocol);
    });

}

Redmine.prototype = {
    JSON: utils.JSON,

    getPath: function (path, params) {

        if (path.slice(0, 1) !== '/') {
            path = '/' + path;
        }

        return this.rootPath + path +
            ( params != null ?
                ('?' + querystring.stringify(params || {}) ) :
                ''
            );
    },

    request: function (method, path, params) {
        var d = D(), options, req;

        options = {
            host: this.host,
            path: this.getPath(path, method === 'GET' ? params : null),
            method: method,
            headers: {
                'X-Redmine-API-Key': this.apiKey
            }
        };

        this.basicAuth && (options.auth = this.basicAuth);

        req = this.transport.request(options, function (res) {
            var body = '';

            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                d.resolve(utils.JSON.parse(body || res.statusCode));
            });

            if (!~([200, 201]).indexOf(res.statusCode)) {
                d.reject('Server returns stats code: ' + res.statusCode);
            }
        });

        req.on('error', d.reject);
        req.setHeader('Content-Type', 'application/json');

        if (method !== 'GET') {
            var body = utils.JSON.stringify(params || {});
            req.setHeader('Content-Length', body.length);
            req.setHeader('Content-Type', 'application/json');
            req.write(body);
        }

        req.end();

        d.promise.rethrow(function (e) {
            console.log('ERROR', e, req);
        });

        return d.promise;
    },

    getIssues: function (params) {
        return this.request('GET', '/issues.json', params);
    },

    getIssue: function (id) {
        return this.request('GET', '/issues/' + id + '.json', {}).success(function (issueContainer) {
            return issueContainer.issue || issueContainer;
        });
    },

    getAllIssuesSince: function (since, params) {
        since.toISOString && (since = since.toISOString());
        params || (params = {} );
        params.sort = 'updated_on:desc';
        params.limit || (params.limit = 100);
        var self = this;
        var d = D()
            , res = []
            , getNext;

        getNext = function getNext (data) {
            var fulfilled = false;

            data.issues.forEach(function (v) {

                if (since >= v.updated_on) {
                    fulfilled = true;
                }

                fulfilled || res.push(v);
            });

            if ((!fulfilled) && (data.total_count > (data.limit + data.offset))) {
                params.offset = data.limit + data.offset;
                params.limit = data.limit;
                return self.getIssues(params).success(getNext).rethrow(d.reject);
            }

            return d.resolve(res);
        };

        self.getIssues(params).success(getNext).rethrow(d.reject);
        return d.promise
    },

    postIssue: function (params) {
        return this.request('POST', '/issues.json', { issue: params });
    },

    updateIssue: function (id, params) {
        return this.request('PUT', '/issues/' + id + '.json', { issue: params });
    },

    deleteIssue: function (id) {
        this.request('DELETE', '/issues/' + id + '.json', {});
    },

    getUsers: function (params) {
        return this.request('GET', '/users.json', params);
    },

    getUser: function (id) {
        return this.request('GET', '/users/' + id + '.json', {});
    },

    getUserCurrent: function () {
        return this.request('GET', '/users/current.json');
    },

    /**
     * Get all groups
     * @param params {object} params of paginator
     * @returns {promise}
     */
    getGroups: function(params) {
        return this.request('GET', '/groups.json', params);
    },

    /**
     * get current group
     * @param id {number} of group
     * @param params {object} example { include: 'users' || 'memberships' }
     * @returns {promise}
     */
    getGroup: function(id, params) {
        return this.request('GET', '/groups/' + id + '.json', params);
    },

    /**
     * Added user to Group
     * @param groupId {Number} id of current group
     * @param userId {Number} id of current user
     * @returns {promise}
     */
    addUserToGroup: function(groupId, userId) {
        return this.request('POST', '/group/' + groupId + '.json', { user_id: userId });
    },

    getProjects: function (params) {
        return this.request('GET', '/projects.json', params);
    },

    getProject: function (id) {
        return this.request('GET', '/projects/' + id + '.json', {});
    },

    getTimeEntries: function (params) {
        return this.request('GET', '/time_entries.json', params);
    },

    getTimeEntry: function (id) {
        return this.request('GET', '/time_entries/' + id + '.json', {});
    },

    postTimeEntry: function (params) {
        return this.request('POST', '/time_entries/' + id + '.json', {time_entry: params});
    },

    updateTimeEntry: function (id, params) {
        return this.request('PUT', '/time_entries/' + id + '.json', {time_entry: params});
    },

    deleteTimeEntry: function (id) {
        return this.request('DELETE', '/time_entries/' + id + '.json', {});
    }
};

module.exports = Redmine;
