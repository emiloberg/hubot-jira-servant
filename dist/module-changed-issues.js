// Description:
//   Displays a list of all changed Jira issues.
//
// Configuration:
//   HUBOT_JIRA_USER
//   HUBOT_JIRA_PASS
//   HUBOT_JIRA_HOST
//
// Commands:
//   hubot jira changed - Get yesterdays changed jira issues
//   hubot jira changed <days> - Get jira issues changed the passed <days> days.
//   hubot jira changed <date> <date> - Get jira issues changed the day between <date> and <date>
//   hubot jira changed <date> <days> - Get jira issues changed the day between [<days> days before <date>] and <date>
//   hubot jira changed <date> - Get jira issues changed the day before <date>
//
// Author:
//   Emil Öberg <emil.oberg@monator.com>

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// Internal

var _jira = require('./jira');

var _jira2 = _interopRequireDefault(_jira);

var _utils = require('./utils');

var _utils2 = _interopRequireDefault(_utils);

// Misc Packages
require('es6-promise').polyfill();
var fs = require('fs-extra');
var moment = require('moment');
var uuid = require('uuid');
var path = require('path');

// Handlebars
var handlebars = require('handlebars');
var Swag = require('swag');
Swag.registerHelpers(handlebars);

// HTML Decode
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

// Settings
var settings = {
	historyFieldBlacklist: ['assignee', 'rank'],
	paths: {
		templates: {
			changedIssues: 'changed-issues.hbs'
		}

	},
	templates: {
		changedIssues: ''
	}
};

settings.urlToIssue = 'https://' + process.env.HUBOT_JIRA_HOST + '/browse/';

/**
 * Initialize app:
 *
 * Read and save all handlebar templates
 * Set Jira credentials
 */
(function init() {
	Object.keys(settings.paths.templates).forEach(function (key) {
		var templatePath = path.resolve(__dirname, 'templates', settings.paths.templates[key]);
		settings.templates[key] = handlebars.compile(fs.readFileSync(templatePath, { encoding: 'UTF-8' }));
	});
})();

/**
 * Get changed issues from Jira
 *
 * @param dateMax
 * @param dateMin
 * @returns {Promise}
 */
function getChangedIssues(dateMax, dateMin) {
	// TODO: REMOVE EHP FROM HERE AND MOVE INTO AN ENVIRONMENT VARIABLE.
	var jql = 'project = EHP AND updated > ' + dateMin + ' AND updated < ' + dateMax;
	return new Promise(function (resolve, reject) {
		_jira2['default'].search.search({
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
function parseChangedIssues(issues, dateMax, dateMin) {
	var historyFieldBlacklist = arguments.length <= 3 || arguments[3] === undefined ? settings.historyFieldBlacklist : arguments[3];

	return issues.map(function (issue) {
		var flatHistory = [];
		var out = {
			summary: entities.decode(issue.fields.summary.trim()),
			summaryNoLb: _utils2['default'].removeLineBreaks(entities.decode(issue.fields.summary.trim())),
			key: issue.key,
			type: issue.fields.issuetype.name,
			status: issue.fields.status.name,
			statusEmoji: _utils2['default'].statusToEmoji(issue.fields.status.name),
			url: '' + settings.urlToIssue + issue.key,
			parent: undefined,
			history: []
		};

		/**
   * Get parent if available
   */
		if (issue.fields.parent) {
			out.parent = {
				key: issue.fields.parent.key,
				summary: entities.decode(issue.fields.parent.fields.summary.trim()),
				summaryNoLb: _utils2['default'].removeLineBreaks(entities.decode(issue.fields.parent.fields.summary.trim()))
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
			(function () {
				var tempHist = [];
				issue.changelog.histories.forEach(function (history) {
					var histDateChanged = moment(_utils2['default'].jiraDateStrToMoment(history.created)).format('YYYY-MM-DD HH:mm:ss');
					var histDateMax = moment(dateMax).add(1, 'days').format('YYYY-MM-DD');
					var histDateMin = moment(dateMin).subtract(1, 'days').format('YYYY-MM-DD');
					if (moment(histDateChanged).isBetween(histDateMin, histDateMax, 'day')) {
						return history.items.map(function (historyItem) {
							tempHist.push({
								uuid: uuid.v4(),
								time: histDateChanged,
								action: 'changed',
								actor: history.author.displayName,
								field: historyItem.field,
								from: historyItem.fromString ? entities.decode(historyItem.fromString) : '',
								fromNoLb: _utils2['default'].removeLineBreaks(historyItem.fromString ? entities.decode(historyItem.fromString) : ''),
								to: historyItem.toString ? entities.decode(historyItem.toString) : '',
								toNoLb: _utils2['default'].removeLineBreaks(historyItem.toString ? entities.decode(historyItem.toString) : '')
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
				tempHist.forEach(function (historyItem) {
					var shouldBeAdded = false;
					if (historyFieldBlacklist.indexOf(historyItem.field.toLowerCase()) > -1) {
						// Check against blacklist
						shouldBeAdded = false;
					} else if (historyItem.action === 'created') {
						// Created can only be in the list once
						shouldBeAdded = true;
					} else {
						shouldBeAdded = tempHist.every(function (checkItem) {
							if (historyItem.uuid === checkItem.uuid) {
								// Checking against self
								return true;
							}
							if (historyItem.field !== checkItem.field) {
								// Add if different type (field)
								return true;
							}
							return moment(historyItem.time).isAfter(checkItem.time, 'second'); // Checking which is the final one
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
				var nestedHistory = [];
				flatHistory.forEach(function (historyItem) {
					if (!nestedHistory[historyItem.actor]) {
						nestedHistory[historyItem.actor] = [];
					}
					nestedHistory[historyItem.actor].push(historyItem);
				});

				Object.keys(nestedHistory).forEach(function (key) {
					out.history.push({
						actor: key,
						entries: nestedHistory[key]
					});
				});
			})();
		}
		return out;
	})
	/**
  * Remove issues without history (e.g. where the history entries are
  * blacklisted).
  */
	.filter(function (issue) {
		return issue.history.length > 0;
	});
}

/**
 * Formats changed issues into an array of messages ready to be sent to Slack.
 *
 * @param issues
 * @param template
 * @returns {Array}
 */
function renderTemplate(issues, template) {
	return issues.map(function (issue) {
		return settings.templates[template](issue);
	});
}

/**
 * Expose to Hubot
 * Parse incoming data
 *
 * @param robot
 */
module.exports = function (robot) {
	robot.respond(/j(ira)* changed/i, function (res) {
		var command = res.message.text;

		var dateMax = undefined;
		var dateMin = undefined;

		var matchDateDate = command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2}) (\d{4}-\d{1,2}-\d{1,2})/i); // jira changed 2014-01-01 2013-12-30
		var matchDateNumber = command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2}) (\d+)/i); // jira changed 2014-01-01 5
		var matchDate = command.match(/j(?:ira)* changed (\d{4}-\d{1,2}-\d{1,2})/i); // jira changed 2014-01-01
		var matchNumber = command.match(/j(?:ira)* changed (\d+)/i); // jira changed 2

		if (matchDateDate) {
			dateMin = matchDateDate[1];
			dateMax = matchDateDate[2];
			_utils2['default'].validateDateIsntFuture(dateMax).then(function () {
				return _utils2['default'].validateDateIsntFuture(dateMin);
			}).then(function () {
				var diff = moment(dateMax).diff(dateMin, 'days');
				if (diff === 0) {
					throw 'You really should try to give me at least one day to search for. I can\'t really do anything with this information, can I?';
				} else if (diff < 0) {
					throw 'Ridiculous! the start date you gave me happens after the end date. What am I supposed to do with that? Huh?';
				}
			}).then(function () {
				doLookup(robot, res, dateMax, dateMin);
			})['catch'](function (err) {
				res.send(err);
			});
		} else if (matchDateNumber) {
			dateMax = matchDateNumber[1];
			_utils2['default'].validateDateIsntFuture(dateMax).then(function () {
				dateMin = moment(dateMax).subtract(matchDateNumber[2], 'days').format('YYYY-MM-DD');
				doLookup(robot, res, dateMax, dateMin);
			})['catch'](function (err) {
				res.send(err);
			});
		} else if (matchDate) {
			dateMax = matchDate[1];
			_utils2['default'].validateDateIsntFuture(dateMax).then(function () {
				dateMin = moment(dateMax).subtract(1, 'days').format('YYYY-MM-DD');
				doLookup(robot, res, dateMax, dateMin);
			})['catch'](function (err) {
				res.send(err);
			});
		} else if (matchNumber) {
			dateMax = moment().format('YYYY-MM-DD');
			dateMin = moment(dateMax).subtract(matchNumber[1], 'days').format('YYYY-MM-DD');
			doLookup(robot, res, dateMax, dateMin);
		} else {
			dateMax = moment().format('YYYY-MM-DD');
			dateMin = moment(dateMax).subtract(1, 'days').format('YYYY-MM-DD');
			doLookup(robot, res, dateMax, dateMin);
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
function doLookup(robot, res, dateMax, dateMin) {
	res.send('Hang tight while I look up ' + _utils2['default'].dateToFriendlyDate(dateMin) + ' to ' + _utils2['default'].dateToFriendlyDate(dateMax));
	getChangedIssues(dateMax, dateMin).then(function (issues) {
		return parseChangedIssues(issues, dateMax, dateMin);
	}).then(function (issues) {
		return renderTemplate(issues, 'changedIssues');
	}).then(function (issues) {

		if (issues.length) {
			_utils2['default'].sendMessages(robot, res, issues);
		} else {
			res.send('Nope, nothing found for those dates.');
		}
	})['catch'](function (err) {
		_utils2['default'].printErr(err);
	});
}