var http = require('http');
var https = require('https');
var querystring = require('querystring');
var D = require('d.js');

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

//@todo make this an array to allow multiple redmine client creation
var apiKey = ''
	,host = ''
	,basicAuth = ''
	,protocol='http'
;

/**
 *  Redmine
 */
function Redmine(config) {
	if (!config.apiKey || !config.host) {
		throw new Error("Error: apiKey and host must be configured.");
	}
	this.setApiKey(config.apiKey)
		.setHost(config.host)
		.setBasicAuth(config.basicAuth || '')
		.setProtocol(config.protocol || 'http')
	;
}
var proto = {
	version: '0.2.3'
	,JSONStringify: JSONStringify
	,setApiKey: function(k){ apiKey = k; return this; }
	,getApiKey: function(){ return apiKey; }
	,setHost: function(h){ host = h; return this; }
	,getHost: function(){ return host;}
	,setBasicAuth: function(b){ basicAuth = b; return this; }
	,getBasicAuth: function(){ return basicAuth || '';}
	,setProtocol: function(p){
		if(! p.match(/^https?/)){
			throw new Error('Protocol must be one of http, https');
		}
		protocol = p;
	}
	,getProtocol:function(){ return protocol; }
	,generatePath: function(path, params) {
		if (path.slice(0, 1) !== '/') {
			path = '/' + path;
		}
		return path + '?' + querystring.stringify(params||{});
	}
	,request: function(method, path, params){
		//- console.log(arguments)
		var d=D(),options,req;
		if (! (apiKey && host)) {
			d.reject("Error: apiKey and host must be configured.");
			return d.promise;
		}

		options = {
			host: host
			,path: method === 'GET' ? this.generatePath(path, params) : path
			,method: method
			,headers: {
				'X-Redmine-API-Key': apiKey
			}
			//- ,agent:false
		};
		basicAuth && (options.auth = basicAuth);

		req = (protocol==='https' ? https : http).request(options, function(res){
			var body='';
			//- console.log('STATUS: ' + res.statusCode);
			//- console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				//- console.log('CHUNCK',chunk,'previous',body)
				body += chunk;
			});
			res.on('end', function(e) {
				//- console.log('END',body);
				var data = JSON.parse(body||res.statusCode);
				d.resolve(data);
			});
			//console.log('REs: ',res);
			if ( !~([200,201]).indexOf(res.statusCode) ) {
				console.log('STATUSCODE REJECTIONS',res.statusCode);
				d.reject('Server returns stats code: ' + res.statusCode);
				return;
			}
		});

		req.on('error', d.reject );
		req.setHeader('Content-Type', 'application/json');

		if (method !== 'GET') {
			var body = JSONStringify(params||{});
			req.setHeader('Content-Length', body.length);
			req.setHeader('Content-Type', 'application/json');
			req.write(body);
		}
		req.end();
		d.promise.rethrow(function(e){ console.log('ERROR',e,req) })
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
