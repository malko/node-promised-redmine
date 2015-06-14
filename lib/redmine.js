/*jshint strict:false, node:true, indent:false, forin:false, bitwise:false*/
/*global JSON*/
var http = require('http')
	, https = require('https')
	, querystring = require('querystring')
	, D = require('d.js')
	, packageJson = require('../package.json')
	, fs = require('fs')
	, splitca = require('split-ca')
	, keyPassphrases = []
;

function escapeJSONString(key, value) {
	if (typeof value === 'string') {
		return value.replace(/[^ -~\b\t\n\f\r"\\]/g, function (a) {
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
		throw new Error('Error: apiKey and host must be configured.');
	}
	config || (config = {});
	this.keyPassId = keyPassphrases.length;
	keyPassphrases.push({key:null, passphrase:null});
	this.verbose = false;
	this.setApiKey(config.apiKey)
		.setHost(config.host)
		.setProtocol(config.protocol || 'http')
		.setPort(config.port || (config.protocol === 'https' ? 443 : 80))
		.setBasicAuth(config.basicAuth || '')
		.setPathPrefix(config.pathPrefix || '/')
		.setSslCaCert(config.sslCaCert || null)
		.setSslClientCert(config.sslClientCert || null)
		.setSslClientKey(config.sslClientKey || null, config.sslClientPassphrase || null)
		.setMaxTry(config.maxTry||1)
		.setMaxDelay(config.maxDelay)
	;
}
var proto = {
	version: packageJson.version
	, JSONStringify: JSONStringify
	, setApiKey: function(k){ this.apiKey = k; return this; }
	, getApiKey: function(){ return this.apiKey; }
	, setHost: function(h){ this.host = h; return this; }
	, getHost: function(){ return this.host;}
	, setPort: function(p){ this.port = p; return this; }
	, getPort: function(){ return this.port;}
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
	, setPathPrefix: function(p){
		if (p.slice(0, 1) !== '/') {
			p = '/' + p;
		}
		this.pathPrefix = p;
		return this;
	}
	, getPathPrefix: function(){ return this.pathPrefix; }
	, setSslCaCert: function(c){ this.sslCaCert = c ? splitca(c) : null; return this; }
	, getSslCaCert: function(){ return this.sslCaCert; }
	, setSslClientCert: function(c){ this.sslClientCert = c ? fs.readFileSync(c) : null; return this; }
	, getSslClientCert: function(){ return this.sslClientCert; }
	, setSslClientKey: function(k, p){
		keyPassphrases[this.keyPassId].key =  k ? fs.readFileSync(k) : null;
		keyPassphrases[this.keyPassId].passphrase = k && p || null;
		return this;
	}
	, setMaxTry: function(maxTry){ this.maxTry = maxTry < 1 ? 1 : maxTry; return this; }
	, getMaxTry: function(){ return this.maxTry; }
	, setMaxDelay: function(maxDelay){ this.maxDelay = maxDelay ? maxDelay : 2000; return this; }
	, getMaxDelay: function() { return this.maxDelay; }
	, setVerbose: function(v) { this.verbose = v!==undefined ? !!v : true; }
	, getVerbose: function() { return this.verbose; }
	, generatePath: function(path, params) {
		return path + (params && Object.keys(params).length ? ('?' + querystring.stringify(params||{})) : '');
	}
	, request: function(method, path, params){
		params || (params = {});

		var self = this
			, d = D()
			, keyPass  = keyPassphrases[this.keyPassId]
			, retry = params.retry || {}
			, verbose = this.verbose
			, impersonation
			, options
			, req
		;
		if (params.retry) {
			delete params.retry;
		}
		retry.count || (retry.count = 1);
		retry.maxTry || (retry.maxTry = self.maxTry);
		retry.maxDelay || (retry.maxDelay = self.maxDelay);

		if (params.impersonate) {
			impersonation = params.impersonate;
			delete params.impersonate;
		}

		if (! (this.apiKey && this.host)) {
			d.reject('Error: apiKey and host must be configured.');
			return d.promise;
		}

		path.slice(0, 1) !== '/' && (path = '/' + path);
		if (retry.count === 1) {
			self.pathPrefix && (path = self.pathPrefix + path);
		}
		options = {
			host: self.host
			, port: self.port
			, path: method === 'GET' ? self.generatePath(path, params) : path
			, method: method
			, headers: {
				'X-Redmine-API-Key': self.apiKey
			}
			, agent: false // required for ssl options to work
		};

		impersonation && (options.headers['X-Redmine-Switch-User'] = impersonation);

		self.basicAuth && (options.auth = self.basicAuth);
		self.sslCaCert && (options.ca = self.sslCaCert);
		self.sslClientCert && (options.cert = self.sslClientCert);
		keyPass.key && (options.key = keyPass.key);
		keyPass.passphrase && (options.passphrase = keyPass.passphrase);

		req = (self.protocol==='https' ? https : http).request(options, function(res){
			var body='';
			res.setEncoding('utf8');
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				if( !~([200,201]).indexOf(res.statusCode) ){
					verbose && console.log('STATUSCODE REJECTION:', res.statusCode, '\n' + body);
					d.reject('STATUSCODE_REJECTION ' + res.statusCode);
					return;
				}
				try {
					var data = JSON.parse(body || res.statusCode);
					d.resolve(data);
				}catch(e){
					verbose && console.log("Error: Broken json in response:\n", body);
					d.reject("Error: Broken json in response");
				}
			});

		});

		req.on('error', function(e){
			verbose && console.log('Error: request error', e);
			d.reject('ERROR_REQUEST');
		});

		req.setHeader('Content-Type', 'application/json');

		if (method !== 'GET') {
			var body = JSONStringify(params);
			req.setHeader('Content-Length', body.length);
			req.setHeader('Content-Type', 'application/json');
			req.write(body);
		}
		req.end();

		return d.promise.error(function(e){
			if ( e === 'ERROR_REQUEST' && retry.count < retry.maxTry ) {
				verbose && console.log('retry previous request');
				return D.wait(Math.min(1 << retry.count, retry.maxDelay)).then(function(){
					retry.count++;
					params.retry = retry;
					impersonation && (params.impersonate = impersonation);
					return self.request(method, path, params);
				});
			}
			verbose && console.log('ERROR', e);//, req);
			throw e;
		});
	}

	/// GENERIC CRUD METHODS ///
	/**
	* @param {string} path without .json extension and leading / e.g. issues or issues/5
	* @return {promise}
	*/
	, get: function(path, params){ return this.request('GET', '/' + path + '.json', params); }

	/**
	* @param {string} what e.g. issues, projects ...
	* @param {date} since date object or iso string
	* @param {*} params
	* @return {promise}
	*/
	, getAllSince: function(what, since, params){
		since.toISOString && (since = since.toISOString());
		params || (params = {} );
		params.sort = 'updated_on:desc';
		params.limit || (params.limit=100);
		var self = this
			, d = D()
			, res = []
			, getNext = function getNext(data){
				var fulfilled=false;
				data[what].forEach(function(v){
					if( since >= v.updated_on ){
						fulfilled=true;
					}
					fulfilled || res.push(v);
				});
				if( (!fulfilled) && (data.total_count > (data.limit+data.offset)) ){
						params.offset = data.limit+data.offset;
						params.limit = data.limit;
						return self.get(what, params).success(getNext).rethrow(d.reject);
				}
				return d.resolve(res);
			}
		;
		self.get(what, params).success(getNext).rethrow(d.reject);
		return d.promise;
	}

	/**
	* @param {string} path without .json extension and leading / e.g. issues
	* @param {*} params
	* @return {promise}
	*/
	, post: function(path, params){
		return this.request('POST', '/' + path + '.json', params);
	}
	/**
	* @param {string} path without .json extension and leading / e.g. issues/id
	* @param {*} params
	* @return {promise}
	*/
	, put: function(path, params){
		return this.request('PUT', '/' + path + '.json', params);
	}

	/**
	* @param {string} path without .json extension and leading / e.g. issues/id
	* @param {*} params
	* @return {promise}
	*/
	, del: function(path, params){
		return this.request('DELETE', '/' + path + '.json', params);
	}


	/// CRUD ISSUES APIS ///
	, getIssues: function(params){ return this.get('issues', params); }
	, getIssue: function(id, params){
		return this.get('issues/' + id, params)
			.success(function(issueContainer){ return issueContainer.issue || issueContainer;})
		;
	}
	, getAllIssuesSince:function(since, params){
		return this.getAllSince('issues', since, params);
	}
	, postIssue: function(issue, params) {
		params || (params = {});
		params.issue = issue;
		return this.post('issues', params);
	}
	, updateIssue: function(id, issue, params) {
		params || (params = {});
		params.issue = issue;
		return this.put('issues/' + id, params);
	}
	, deleteIssue: function(id, params) { this.del('issues/' + id, params); }


	///----- USERS METHODS -----///
	, getUsers: function(params){ return this.get('users', params); }
	, getUser: function(id, params){ return this.get('users/' + id, params); }
	, getUserCurrent:function(params){ return this.get('users/current', params); }


	///----- PROJECTS METHODS -----///
	,getProjects: function(params){ return this.get('projects', params); }
	,getProject: function(id, params){ return this.get('projects/' + id, params); }
	,getAllProjectsSince: function(since, params) {
		return this.getAllSince('projects', since, params);
	}


	///----- TIME_ENTRIES METHOD -----///
	,getTimeEntries: function(params){return this.get('time_entries', params); }
	,getTimeEntry: function(id, params){ return this.get('time_entries/' + id, params); }
	,postTimeEntry: function(timeEntry, params){
		params || (params = {});
		params.time_entry = timeEntry;
		return this.post('time_entries', params);
	}
	,updateTimeEntry: function(id, timeEntry, params){
		params || (params = {});
		params.time_entry = timeEntry;
		return this.put('time_entries/' + id, params);
	}
	,deleteTimeEntry: function(id, params) { return this.del('time_entries/' + id, params); }
};


for( var prop in proto){ Redmine.prototype[prop] = proto[prop]; }

/*
 * Exports
 */
module.exports = Redmine;
