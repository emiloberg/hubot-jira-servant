let JiraClient = require('jira-connector');

if (!process.env.HUBOT_JIRA_USER || !process.env.HUBOT_JIRA_PASS || !process.env.HUBOT_JIRA_HOST) {
	console.log('Missing environment variable(s)');
	console.log('Need: HUBOT_JIRA_USER, HUBOT_JIRA_PASS and HUBOT_JIRA_HOST');
	process.exit(1);
}

let jira = new JiraClient({
	host: process.env.HUBOT_JIRA_HOST,
	basic_auth: {
		username: process.env.HUBOT_JIRA_USER,
		password: process.env.HUBOT_JIRA_PASS
	}
});

export default jira;
