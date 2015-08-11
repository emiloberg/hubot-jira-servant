// Description:
//   Displays a list of all changed Jira issues.
//
// Configuration:
//   HUBOT_JIRA_USER
//   HUBOT_JIRA_PASS
//   HUBOT_JIRA_HOST
//
// Commands:
//   hubot jira changed [project] - Get yesterdays changed jira issues
//   hubot jira changed <days> [project] - Get jira issues changed the passed <days> days.
//   hubot jira changed <date> <date> [project] - Get jira issues changed the day between <date> and <date>
//   hubot jira changed <date> <days> [project] - Get jira issues changed the day between [<days> days before <date>] and <date>
//   hubot jira changed <date> [project] - Get jira issues changed the day before <date>
//
// Author:
//   Emil Öberg <emil.oberg@monator.com>

'use strict';

// Internal
import jira from './jira';
import utils from './utils';

// Misc Packages
require('es6-promise').polyfill();
let fs = require('fs-extra');
let moment = require('moment');
let uuid = require('uuid');
var path = require('path');

// Handlebars
let handlebars = require('handlebars');
let Swag = require('swag');
Swag.registerHelpers(handlebars);

// HTML Decode
let Entities = require('html-entities').AllHtmlEntities;
let entities = new Entities();

// Settings
let settings = {
	historyFieldBlacklist: [],
	paths: {
		templates: {
			changedIssues: 'changed-issues.hbs'
		}

	},
	templates: {
		changedIssues: ''
	}
};


settings.urlToIssue = `https://${process.env.HUBOT_JIRA_HOST}/browse/`;


/**
 * Initialize app:
 *
 */
(function init() {
	/**
	 * Read and save all handlebar templates
	 */
	Object.keys(settings.paths.templates).forEach(key => {
		let templatePath = path.resolve(__dirname, 'templates', settings.paths.templates[key]);
		settings.templates[key] = handlebars.compile(fs.readFileSync(templatePath, {encoding: 'UTF-8'}));
	});

	/**
	 * Parse Blacklist environment variable if available
	 */
	if (process.env.HUBOT_JIRA_ACTION_BLACKLIST !== undefined) {
		try {
			settings.historyFieldBlacklist = process.env.HUBOT_JIRA_ACTION_BLACKLIST.split('|');
		} catch (err) {
			console.log("ERROR: Could not read environment parameter HUBOT_JIRA_ACTION_BLACKLIST. It's probably malformed");
		}
	}
})();


/**
 * Get changed issues from Jira
 *
 * @param dateMax
 * @param dateMin
 * @returns {Promise}
 */
function getChangedIssues(dateMax, dateMin, project = undefined) {

	if (project === undefined) {
		project = process.env.HUBOT_JIRA_DEFAULT_PROJECT;
	}

	let jql = `project = ${project} AND updated > ${dateMin} AND updated < ${dateMax}`;
	return new Promise(function (resolve, reject) {
		jira.search.search({
			jql: jql,
			maxResults: 200,
			expand: ['changelog']
		}, function (err, issues) {
			if (err) {
				return reject(err);
			}
			resolve(issues.issues);
		});
	});
}


/**
 * Dig out the data we want
 *
 * @param issues
 * @param dateMax
 * @param dateMin
 * @param historyFieldBlacklist
 * @returns {Array.<string>}
 */
function parseChangedIssues(issues, dateMax, dateMin, historyFieldBlacklist = settings.historyFieldBlacklist) {
	return issues.map(issue => {

		let flatHistory = [];
		let out = {
			summaryNoLb: utils.removeLineBreaks(entities.decode(issue.fields.summary.trim())),
			urlToIssue: `${settings.urlToIssue}${issue.key}`,
			parent: undefined,
			history: []
		};

		/**
		 * Get parent if available
		 */
		if (issue.fields.parent) {
			out.parent = {
				summaryNoLb: utils.removeLineBreaks(entities.decode(issue.fields.parent.fields.summary.trim()))
			};
		}

		/**
		 * If it's a _new_ issue, just set it as created
		 */
		if (issue.fields.created === issue.fields.updated) {
			flatHistory.push({
				time: issue.fields.created,
				action: 'created',
				actor: issue.fields.creator.displayName
			});
		}

		/**
		 * Parse the history,
		 * As we get the *full* history of the issue, from beginning of time,
		 * but only want the history entries which has happened in between our start and end dates,
		 * we need to check the timestamps.
		 */
		if (issue.changelog.histories) {
			let tempHist = [];
			issue.changelog.histories.forEach(history => {
				let histDateChanged = moment(utils.jiraDateStrToMoment(history.created)).format('YYYY-MM-DD HH:mm:ss');
				let histDateMax = moment(dateMax).add(1, 'days').format('YYYY-MM-DD');
				let histDateMin = moment(dateMin).subtract(1, 'days').format('YYYY-MM-DD');
				if(moment(histDateChanged).isBetween(histDateMin, histDateMax, 'day')) {
					return history.items.map((historyItem) => {
						tempHist.push({
							uuid: uuid.v4(),
							time: histDateChanged,
							action: 'changed',
							actor: history.author.displayName,
							field: historyItem.field,
							fromString: historyItem.fromString ? entities.decode(historyItem.fromString) : '',
							toString: historyItem.toString ? entities.decode(historyItem.toString) : '',
							original: history
						});
					});
				}
			});

			/**
			 * Remove "dupes"
			 * If the same field is changed more than once (e.g if the title is updated 5 times
			 * in a day) only show the last (final) entry.
			 *
			 * Also removes unwanted changes.
			 * Like, it's maybe not that important to know what an assignee is changed.
			 * Checks the changes to a blacklist of changes we don't want.
			 */
			tempHist.forEach(historyItem => {
				let shouldBeAdded = false;
				if (historyFieldBlacklist.indexOf(historyItem.field.toLowerCase()) > -1) { // Check against blacklist
					shouldBeAdded = false;
				} else if (historyItem.action === 'created') { // Created can only be in the list once
					shouldBeAdded = true;
				} else {
					shouldBeAdded = tempHist.every(checkItem => {
						if (historyItem.uuid === checkItem.uuid) { // Checking against self
							return true;
						}
						if (historyItem.field !== checkItem.field) { // Add if different type (field)
							return true;
						}
						return (moment(historyItem.time).isAfter(checkItem.time, 'second')); // Checking which is the final one
					});
				}
				if (shouldBeAdded) {
					flatHistory.push(historyItem);
				}
			});


			/**
			 * Make history array nested.
			 * OOTB the list of history items is just a flat array, to be able to
			 * print this in a more usable way we nest every history item under
			 * the name of the actor.
			 */
			let nestedHistory = [];
			flatHistory.forEach(historyItem => {
				if (!nestedHistory[historyItem.actor]) {
					nestedHistory[historyItem.actor] = [];
				}
				nestedHistory[historyItem.actor].push(historyItem);
			});

			Object.keys(nestedHistory).forEach(key => {
				out.history.push({
					actor: key,
					entries: nestedHistory[key]
				});
			});

		}

		issue._custom = out;
		
		return issue;
	})
	/**
	 * Remove issues without history (e.g. where the history entries are
	 * blacklisted).
	 */
	.filter(issue => issue._custom.history.length > 0);
}


/**
 * Formats changed issues into an array of messages ready to be sent to Slack.
 *
 * @param issues
 * @param template
 * @returns {Array}
 */
function renderTemplate(issues, template) {
	return issues.map(issue => {
		return settings.templates[template](issue);
	});
}


/**
 * Expose to Hubot
 * Parse incoming data
 *
 * @param robot
 */
module.exports = function(robot) {
	robot.respond(/j(ira)* changed/i, function(res) {
		let command = res.message.text;

		let dateMax;
		let dateMin;

		let matchDateDate		= command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2}) (\d{4}-\d{1,2}-\d{1,2})( [A-Za-z]{1,10})?/i);	// jira changed 2014-01-01 2013-12-30
		let matchDateNumber		= command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2}) (\d+)( [A-Za-z]{1,10})?/i); 						// jira changed 2014-01-01 5
		let matchDate			= command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2})( [A-Za-z]{1,10})?/i); 							// jira changed 2014-01-01
		let matchNumber			= command.match(/j(?:ira)* changed (\d+)( [A-Za-z]{1,10})?/i); 												// jira changed 2
		let matchDefault		= command.match(/j(?:ira)* changed( [A-Za-z]{1,10})?/i); 													// jira changed

		if(matchDateDate) {
			dateMin = matchDateDate[1];
			dateMax = matchDateDate[2];
			utils.validateDateIsntFuture(dateMax)
				.then(() => utils.validateDateIsntFuture(dateMin))
				.then(function () {
					let diff = moment(dateMax).diff(dateMin, 'days');
					if (diff === 0 ) {
						throw "You really should try to give me at least one day to search for. I can't really do anything with this information, can I?";
					} else if (diff < 0) {
						throw 'Ridiculous! the start date you gave me happens after the end date. What am I supposed to do with that? Huh?';
					}
				})
				.then(function () {
					doLookup(robot, res, dateMax, dateMin, matchDateDate[3]);
				})
				.catch(function (err) { res.send(err); });
		} else if(matchDateNumber) {
			dateMax = matchDateNumber[1];
			utils.validateDateIsntFuture(dateMax)
				.then(function () {
					dateMin = moment(dateMax).subtract(matchDateNumber[2], 'days').format('YYYY-MM-DD');
					doLookup(robot, res, dateMax, dateMin, matchDateNumber[3]);
				})
				.catch(function (err) { res.send(err); });
		} else if(matchDate) {
			dateMax = matchDate[1];
			utils.validateDateIsntFuture(dateMax)
				.then(function () {
					dateMin = moment(dateMax).subtract(1, 'days').format('YYYY-MM-DD');
					doLookup(robot, res, dateMax, dateMin, matchDate[2]);
				})
				.catch(function (err) { res.send(err); });
		} else if(matchNumber) {
			dateMax = moment().format('YYYY-MM-DD');
			dateMin = moment(dateMax).subtract(matchNumber[1], 'days').format('YYYY-MM-DD');
			doLookup(robot, res, dateMax, dateMin, matchNumber[2]);
		} else if(matchDefault) {
			dateMax = moment().format('YYYY-MM-DD');
			dateMin = moment(dateMax).subtract(1, 'days').format('YYYY-MM-DD');
			doLookup(robot, res, dateMax, dateMin, matchDefault[1]);
		} else {
			utils.printErrToClient("Nope, didn't understand that!");
		}
	});
};

/**
 * Do lookup and send response
 *
 * @param res
 * @param dateMax
 * @param dateMin
 */
function doLookup(robot, res, dateMax, dateMin, project = undefined) {
	res.send('Hang tight while I look up ' + utils.dateToFriendlyDate(dateMin) + ' to ' + utils.dateToFriendlyDate(dateMax));
	getChangedIssues(dateMax, dateMin, project)
		.then(function (issues) {
			return parseChangedIssues(issues, dateMax, dateMin);
		})
		//.then(function (issues) {
		//	fs.outputJson('./sample-json.json', issues[issues.length-1]);
		//	return issues;
		//})
		.then(function (issues) {
			return renderTemplate(issues, 'changedIssues');
		})
		.then(function (issues) {
			if(issues.length) {
				utils.sendMessages(robot, res, issues);
			} else {
				res.send('Nope, nothing found for those dates.');
			}
		})
		.catch(function (err) {
			utils.printErrToClient(err, robot, res);
		});
}
