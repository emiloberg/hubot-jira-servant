'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var JiraClient = require('jira-connector');

if (!process.env.HUBOT_JIRA_USER || !process.env.HUBOT_JIRA_PASS || !process.env.HUBOT_JIRA_HOST) {
	console.log('Missing environment variable(s)');
	console.log('Need: HUBOT_JIRA_USER, HUBOT_JIRA_PASS and HUBOT_JIRA_HOST');
	process.exit(1); //eslint-disable-line no-process-exit
}

var jira = new JiraClient({
	host: process.env.HUBOT_JIRA_HOST,
	basic_auth: { //eslint-disable-line camelcase
		username: process.env.HUBOT_JIRA_USER,
		password: process.env.HUBOT_JIRA_PASS
	}
});

exports['default'] = jira;
module.exports = exports['default'];