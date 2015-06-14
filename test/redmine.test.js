/*global describe, it, beforeEach*/
'use strict';
var mocha = require('mocha'); //jshint ignore:line
var expect = require('chai').expect;
var nock = require('nock');
var Redmine = require('../lib/redmine.js');
var dummyObj = {id: 5, status: 'ok'};

function expectDummy(promise, done){
	promise.then(function(res) {
		expect(res).to.eql(dummyObj);
		done();
	});
}


describe('node-promised-redmine', function() {
	var redmineApi, mockServer;
	beforeEach(function() {
		// nock.recorder.rec();
		nock.disableNetConnect();
		mockServer = nock('http://127.0.0.1:9090');
		// mockServer.log(console.log);
		var config = {
			host: "127.0.0.1", // required
			port: 9090,
			apiKey: "XXXXXX", // required
			pathPrefix: "/myRedminePath",
			protocol: "http"
		};
		redmineApi = new Redmine(config);
		// redmineApi.setVerbose(true);
	});


describe('have a request method which', function() {
	it('should add a "x-redmine-api-key" header', function(done) {
		mockServer.get('/myRedminePath/testApiKey')
			.matchHeader('x-redmine-api-key', 'XXXXXX')
			.reply(200, dummyObj)
		;
		expectDummy(redmineApi.request('get', '/testApiKey'), done);
	});
	it('should handle a "impersonate" parameter', function(done) {
		mockServer.get('/myRedminePath/testImpersonate')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		expectDummy(redmineApi.request('get', '/testImpersonate', {impersonate: 'fakeuser'}), done);
	});
	it('should handle a "retry" object parameter', function(done) {
		mockServer.get('/myRedminePath/testRetry')
			.replyWithError('Broken')
			.get('/myRedminePath/testRetry')
			.reply(200, dummyObj)
		;
		expectDummy(redmineApi.request('get', '/testRetry', {retry: {maxTry: 3, maxDelay: 50}}), done);
	});
});

describe('have a get method which', function(){
	it('should prepend "/" and append ".json" to the given path', function(done) {
		mockServer
			.get('/myRedminePath/testpath.json')
			.reply(200, dummyObj)
		;
		redmineApi.get('testpath')
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle retry, and impersonate parameters', function(done) {
		mockServer
			.get('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.replyWithError('Broken')
			.get('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		redmineApi.get('testpath', {retry:{maxTry: 2}, impersonate: 'fakeuser'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle additional params', function(done) {
		mockServer
			.get('/myRedminePath/testpath.json?param=1&param2=ok')
			.reply(200, dummyObj)
		;
		redmineApi.get('testpath', {param:1, param2: 'ok'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

describe('have a post method which', function(){
	it('should prepend "/" and append ".json" to the given path', function(done) {
		mockServer
			.post('/myRedminePath/testpath.json')
			.reply(200, dummyObj)
		;
		redmineApi.post('testpath')
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle retry, and impersonate parameters', function(done) {
		mockServer
			.post('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.replyWithError('Broken')
			.post('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		redmineApi.post('testpath', {retry:{maxTry: 2}, impersonate: 'fakeuser'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle additional params', function(done) {
		mockServer
			.post('/myRedminePath/testpath.json', {param:1, param2: 'ok'})
			.reply(200, dummyObj)
		;
		redmineApi.post('testpath', {param:1, param2: 'ok'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

describe('have a put method which', function(){
	it('should prepend "/" and append ".json" to the given path', function(done) {
		mockServer
			.put('/myRedminePath/testpath.json')
			.reply(200, dummyObj)
		;
		redmineApi.put('testpath')
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle retry, and impersonate parameters', function(done) {
		mockServer
			.put('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.replyWithError('Broken')
			.put('/myRedminePath/testpath.json')
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		redmineApi.put('testpath', {retry:{maxTry: 2}, impersonate: 'fakeuser'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle additional params', function(done) {
		mockServer
			.put('/myRedminePath/testpath.json', {param:1, param2: 'ok'})
			.reply(200, dummyObj)
		;
		redmineApi.put('testpath', {param:1, param2: 'ok'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

describe('have a del method which', function(){
	it('should prepend "/" and append ".json" to the given path', function(done) {
		mockServer
			.delete('/myRedminePath/testpath.json') //jshint ignore:line
			.reply(200, dummyObj)
		;
		redmineApi.del('testpath')
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle retry, and impersonate parameters', function(done) {
		mockServer
			.delete('/myRedminePath/testpath.json') //jshint ignore:line
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.replyWithError('Broken')
			.delete('/myRedminePath/testpath.json') //jshint ignore:line
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		redmineApi.del('testpath', {retry:{maxTry: 2}, impersonate: 'fakeuser'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle additional params', function(done) {
		mockServer
			.delete('/myRedminePath/testpath.json', {param:1, param2: 'ok'}) //jshint ignore:line
			.reply(200, dummyObj)
		;
		redmineApi.del('testpath', {param:1, param2: 'ok'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

describe('have a getIssue method which', function(){
	it('should return a single issue', function(done) {
		mockServer
			.get('/myRedminePath/issues/5.json')
			.reply(200, dummyObj)
		;
		redmineApi.getIssue(5)
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

describe('have a postIssue method which', function(){
	it('should post given issue to the server as an issue property', function(done) {
		mockServer
			.post('/myRedminePath/issues.json', {issue: dummyObj})
			.reply(200, dummyObj)
		;
		redmineApi.postIssue(dummyObj)
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
	it('should handle retry, and impersonate parameters', function(done) {
		mockServer
			.post('/myRedminePath/issues.json', {issue: dummyObj})
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.replyWithError('Broken')
			.post('/myRedminePath/issues.json', {issue: dummyObj})
			.matchHeader('X-Redmine-Switch-User', 'fakeuser')
			.reply(200, dummyObj)
		;
		redmineApi.postIssue(dummyObj, {retry:{maxTry: 2}, impersonate: 'fakeuser'})
			.then(function(issue){
				expect(issue).to.eql(dummyObj);
				done();
		});
	});
});

});
