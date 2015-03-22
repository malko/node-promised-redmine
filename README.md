node-promised-redmine
===============

Redmine REST API Client for node.js implemented with promises/A+  [![Codacy Badge](https://www.codacy.com/project/badge/c0c53b7c60dd4f35bda6bbf5d786aa79)](https://www.codacy.com/public/malko/node-promised-redmine.git)

This was a modified version of the original [redmine](https://github.com/sotarok/node-redmine) module by sotarok  using [D.js](https://github.com/malko/D.js) to implement it as a [promises/A+](http://promises-aplus.github.io/promises-spec/) compatible api. But it has been largely rewrote since and is a totally different project now.


Features
---------
* support both http / https protocols
* support basicAuth authentication
* compatible with promises/A+ through [D.js](https://github.com/malko/D.js)
* simple api
* recursively retrieve issues until given date
* exponential backoff retries

Main methods
------------
- **Settings getter/setter**
  - _all setters return the Redmine instance and are chainable_
  - **(get|set)ApiKey(key)** api key given by your redmine server
  - **(get|set)Host(host)** ip or hostname of the redmine api endpoint
  - **(get|set)Port(port)** set remote server port default to 80
  - **(get|set)BasicAuth(auth)** string used as *auth* option of the http request
  - **(get|set)Protocol(protocol)** http or https
  - **(get|set)PathPrefix(prefix)** path prefix to prepend to each request paths
  - **(get|set)SslCaCert(certFilePath)** path or array of path to authority certificates files to check the remote host against
  - **(get|set)SslClientCert(certFilePath)** path to public x509 certificate file to use
  - **setSslClientKey(keyFilePath, passPhrase)*** path to client private key file to use for SSL and associated passphrase
  - **(get|set)MaxTry(maxTry)** max number of retry on request error default to 1
    **(get|set)MaxDelay(maxDelay)** max time in ms to wait between two retry on request error default to 2000
    **(get|set)Verbose(verbose)** boolean value that turn on/off console.log on errors and retries. (default setting to false)


- **Generics**
  - _all generic methods path doesn't require leading slash nor the .json extension e.g. for issues it can be "issues" or "issues/{id}"_
  - **get(path, params)** get a single resource or a list or resources
  - **getAllSince(what, since, params)** helper to get all items of a collection since the given date (isoString or Date instance)
  - **post(path, params)** create a new resource on corresponding path
  -  **put(path, params)** update a given resource with params
  -  **del(path, params)** remove given resource


- **Issues**
  - **getIssues(params)** return list of issues (max 100)
  - **getIssue(id)** return an issue details by its id
  - **getAllIssuesSince(since, params)** return all issues since given date (isoString or Date instance)
  - **postIssue(params)** create a new issue
  - **updateIssue(id, params)** update issue with given id
  - **deleteIssue(id)** delete an issue by its id
- **Users**
  - **getUsers(params)** return list of users (max 100)
  - **getUser(id)** retrieve user details by its id
  - **getUserCurrent()** return current user (the one corresponding to the apiKey)
- **Projects**
  - **getProjects(params)** get a list of projects (max 100)
  - **getProject(id)** return details about a single project by its id
  - **getAllProjectsSince(since, params)** return all projects updated since given date (isoString or Date instance)
- **Time Entries**
  - **getTimeEntries(params)** returns a list of time entries
  - **getTimeEntry(id)** returns time entry of given id
  - **postTimeEntry(params)** returns time entry of given id
  - **updateTimeEntry(id, params)** update time entry corresponding to the given id
  - **deleteTimeEntry(id)** delete time entry of given id

All request made can use a retry settings based on an exponential backoff algorithm.
You can set thoose settings for all request using *setMaxRetry* and *setMaxDelay* methods, or on a request basis by passing a *retry* property to the *params* parameter. This *retry* property should be an object with one or two property of *maxTry* and *maxDelay* e.g. ```var params = {retry: {maxTry:3}}```

Basic Usage example
-------------------
```javascript
var Redmine = require('promised-redmine');
var config = {
  host: "localhost", // required
  apiKey: "XXXXXX", // required
  pathPrefix: "/myRedminePath",
  protocol: "http",
  // if using SSL settings, change protocol and port accordingly
  sslCaCert: '/path/to/root/ca.pem', // defaults to null
  sslClientCert: '/path/to/client/cert.pem', // defaults to null
  sslClientKey: '/path/to/client/cert.key', // defaults to null
  sslClientPassphrase: 'clientKeyPassphrase' // defaults to null
}
var redmineApi = new Redmine(config);
redmineApi.getIssues()
  .success(function(issues){ // success is an alias of then without the promise rejection management in D.js the underlying promise library
    // do something with that
  })
```

Install
---------

Install from npm:

    $ npm install promised-redmine


Link
------

* [redmine api documentation](http://www.redmine.org/projects/redmine/wiki/Rest_api)
