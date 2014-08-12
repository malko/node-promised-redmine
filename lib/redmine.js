/*jshint strict:false, node:true, indent:false, -W052*/
var http = require('http')
	, https = require('https')
	, querystring = require('querystring')
	, D = require('d.js')
	, packageJson = require('../package.json')
;

function escapeJSONString(key, value) {
	if (typeof value === 'string') {
		return value.replace(/[^ -~\b\t\n\f\r"\\]/g, function(a) {
			return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
		});
	}
	return value;
}
function JSONStringify(data) {
	return JSON.stringify(data, escapeJSONString).replace(/\\\\u([\da-f]{4}?)/g, '\\u$1');
}

/**
 *  Redmine
 */
function Redmine(config) {
	if (!config.apiKey || !config.host) {
		throw new Error("Error: apiKey and host must be configured.");
	}
	config || (config = {});
	this.setApiKey(config.apiKey)
		.setHost(config.host)
		.setBasicAuth(config.basicAuth || '')
		.setProtocol(config.protocol || 'http')
		.setPathPrefix(config.pathPrefix || '/')
	;
}
var proto = {
	version: packageJson.version
	, JSONStringify: JSONStringify
	, setApiKey: function(k){ this.apiKey = k; return this; }
	, getApiKey: function(){ return this.apiKey; }
	, setHost: function(h){ this.host = h; return this; }
	, getHost: function(){ return this.host;}
	, setBasicAuth: function(b){ this.basicAuth = b; return this; }
	, getBasicAuth: function(){ return this.basicAuth || '';}
	, setProtocol: function(p){
		if (! p.match(/^https?/)) {
			throw new Error('Protocol must be one of http, https');
		}
		this.protocol = p;
		return this;
	}
	, getProtocol: function(){ return this.protocol; }
	, generatePath: function(path, params) {
		return path + '?' + querystring.stringify(params||{});
	}
	, request: function(method, path, params){
		//- console.log(arguments)
		var self = this, d = D(), options, req;
		if (! (this.apiKey && this.host)) {
			d.reject("Error: apiKey and host must be configured.");
			return d.promise;
		}
		params || (params = {});
		path.slice(0, 1) !== '/' && (path = '/' + path);
		options = {
			host: self.host
			, path: method === 'GET' ? self.generatePath(path, params) : path
			, method: method
			, headers: {
				'X-Redmine-API-Key': self.apiKey
			}
			//- ,agent:false
		};
		self.basicAuth && (options.auth = self.basicAuth);

		req = (self.protocol==='https' ? https : http).request(options, function(res){
			var body='';
			res.setEncoding('utf8');
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var data = JSON.parse(body || res.statusCode);
				d.resolve(data);
			});
			if ( !~([200,201]).indexOf(res.statusCode) ) {
				console.log('STATUSCODE REJECTIONS', res.statusCode);
				d.reject('Server returns stats code: ' + res.statusCode);
				return;
			}
		});

		req.on('error', d.reject );
		req.setHeader('Content-Type', 'application/json');

		if (method !== 'GET') {
			var body = JSONStringify(params);
			req.setHeader('Content-Length', body.length);
			req.setHeader('Content-Type', 'application/json');
			req.write(body);
		}
		req.end();
		d.promise.rethrow(function(e){ console.log('ERROR', e, req); });
		return d.promise;
	}
	/// CRUD ISSUES APIS ///
	,getIssues: function(params){ return this.request('GET', '/issues.json', params); }
	,getIssue: function(id){ return this.request('GET', '/issues/' + id + '.json', {}).success(function(issueContainer){ return issueContainer.issue || issueContainer;}); }
	,getAllIssuesSince:function(since,params){
		since.toISOString && (since = since.toISOString());
		params || (params = {} );
		params.sort='updated_on:desc';
		params.limit || (params.limit=100);
		var self=this;
		var d = D()
			,res = []
			,getNext=function getNext(data){
				var fulfilled=false;
				data.issues.forEach(function(v){
					if( since >= v.updated_on ){
						fulfilled=true;
					}
					fulfilled || res.push(v);
				});
				if( (!fulfilled) && (data.total_count > (data.limit+data.offset)) ){
						params.offset = data.limit+data.offset;
						params.limit = data.limit;
						return self.getIssues(params).success(getNext).rethrow(d.reject);
				}
				return d.resolve(res);
			}
		;
		self.getIssues(params).success(getNext).rethrow(d.reject);
		return d.promise
	}
	,postIssue: function(params) { return this.request('POST', '/issues.json', {issue: params}); }
	,updateIssue: function(id,params) { return this.request('PUT', '/issues/' + id + '.json', {issue: params}); }
	,deleteIssue: function(id) { this.request('DELETE', '/issues/' + id + '.json', {}); }
	///----- USERS METHODS -----///
	,getUsers: function(params){ return this.request('GET','/users.json',params); }
	,getUser: function(id){ return this.request('GET', '/users/' + id + '.json', {}); }
	,getUserCurrent:function(){ return this.request('get','/users/current.json'); }
	///----- PROJECTS METHODS -----///
	,getProjects: function(params){ return this.request('GET','/projects.json',params); }
	,getProject: function(id){ return this.request('GET', '/projects/' + id + '.json', {}); }
	,getAllProjectsSince: function(since,params) {
		since.toISOString && (since = since.toISOString());
		params || (params = {} );
		params.sort='updated_on:desc';
		params.limit || (params.limit=100);
		var self=this;
		var d = D()
			,res = []
			,getNext=function getNext(data){
				var fulfilled=false;
				data.projects.forEach(function(v){
					if( since >= v.updated_on ){
						fulfilled=true;
					}
					fulfilled || res.push(v);
				});
				if( (!fulfilled) && (data.total_count > (data.limit+data.offset)) ){
						params.offset = data.limit+data.offset;
						params.limit = data.limit;
						return self.getProjects(params).success(getNext).rethrow(d.reject);
				}
				return d.resolve(res);
			}
		;
		self.getProjects(params).success(getNext).rethrow(d.reject);
		return d.promise
	}
	///----- TIME_ENTRIES METHOD -----///
	,getTimeEntries: function(params){return this.request('GET','/time_entries.json', params); }
	,getTimeEntry: function(id){ return this.request('GET', '/time_entries/' + id + '.json', {}); }
	,postTimeEntry: function(params){ return this.request('POST', '/time_entries/' + id + '.json', {time_entry: params}); }
	,updateTimeEntry: function(id,params) { return this.request('PUT', '/time_entries/' + id + '.json', {time_entry: params}); }
	,deleteTimeEntry: function(id) { return this.request('DELETE', '/time_entries/' + id + '.json', {}); }
};

for( var prop in proto){ Redmine.prototype[prop] = proto[prop]; }

/*
 * Exports
 */
module.exports = Redmine;
