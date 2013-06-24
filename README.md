node-promised-redmine
===============

Redmine REST API Client for node.js implemented with promises/A+

This is a modified version of the original [redmine](https://github.com/sotarok/node-redmine) module by sotarok  using [D.js](https://github.com/malko/D.js) to implement it as a [promises/A+](http://promises-aplus.github.io/promises-spec/) compatible api. 


Features
---------
* support both http / https protocols
* support basicAuth authentification
* compatible with promises/A+
* simple api
* recursively retrieve issues until given date

Main methods
------------

- **Issues**
  - **getIssues(params)** return list of issues (max 100)
  - **getIssue(id)** return an issue details by its id
  - **getAllIssuesSince(since,params)** return all issues since given date (isoString or Date instance)
  - **postIssue(params)** create a new issue
  - **updateIssue(id,params)** update issue with given id
  - **deleteIssue(id)** delete an issue by its id
- **Users**
  - **getUsers(params)** return list of users (max 100)
  - **getUser(id)** retrieve user details by its id
  - **getUserCurrent()** return current user (the one corresponding to the apiKey)
- **Projects**
  - **getProjects(params)** get a list of projects (max 100)
  - **getProject(id)** return details about a single project by its id



Install
---------

Install from npm:

    $ npm install promised-redmine


Link
------

* [redmine api documentation](http://www.redmine.org/projects/redmine/wiki/Rest_api)
