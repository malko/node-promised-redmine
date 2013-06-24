var Redmine = require('../lib/redmine');

var redmine = new Redmine({
	host: 'redmine host',
	apiKey: 'redmine api key',
});


// get issue
redmine.getIssues({project_id: 1})
	.then(function(data) {
		console.log("Issues:");
		console.log(data);
	},
	function(err) {
		console.log("Error: " + err.message);
		return;
	}
);


// create issue
var issue = {
	project_id: 1,
	subject: "This is test issue on " + Date.now(),
	description: "Test issue description"
};
redmine.postIssue(issue)
	.error(function(err) {
		console.log("Error: " + err.message);
	})
	.success(function(data) {
		console.log(data);
	})
;

// update issue
var issueId = 4; // exist id
var issueUpdate = {
	notes: "this is comment"
};
redmine.updateIssue(issueId, issueUpdate)
	.sucess(function(data) {
		console.log(data);
	})
	.rethrow(function(err) {
		console.log("Error: " + err.message);
	})
;

// delte issue
var issueId = 4;
redmine.deleteIssue(issueId)
	.then(function(data){
		console.log(data);
	},
	function(err) {
		console.log("Error: " + err.message);
	}
);