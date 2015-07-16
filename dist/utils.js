'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var SLACK_MAX_MESSAGE_SIZE = 4000;

var moment = require('moment');

var _statusToEmoji = {
	'In Production': ':white_check_mark:',
	'In Staging': ':white_check_mark:',
	'In Progress': ':tulip:',
	'Resolved': ':turtle:',
	'Open': ':small_blue_diamond:'
};

var utils = {
	jiraDateStrToMoment: function jiraDateStrToMoment(jiraDateStr) {
		return moment(jiraDateStr, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
	},
	removeLineBreaks: function removeLineBreaks(str) {
		return str.replace(/(\r\n|\n|\r)/gm, ' ');
	},
	statusToEmoji: function statusToEmoji(status) {
		if (_statusToEmoji.hasOwnProperty(status)) {
			return _statusToEmoji[status];
		} else {
			return status;
		}
	},
	printErr: function printErr(err) {
		console.log('ERROR!');
		if (err.code) {
			if (err.code === 'ENOTFOUND') {
				console.log('Can not connect to Jira, check host/url');
			} else {
				console.dir(err);
			}
		} else {
			if (typeof err === 'string') {
				if (err.indexOf('Unauthorized') > -1) {
					console.log('Unauthorized, can not connect to Jira, check username/password');
				} else {
					console.log(err);
				}
			} else {
				console.dir(err);
			}
		}
		process.exit(1); //eslint-disable-line no-process-exit
	},
	dateToFriendlyDate: function dateToFriendlyDate(dateStr) {
		if (dateStr === moment().format('YYYY-MM-DD')) {
			return 'today';
		} else if (dateStr === moment().subtract(1, 'days').format('YYYY-MM-DD')) {
			return 'yesterday';
		} else {
			return dateStr + ' (' + moment().diff(dateStr, 'days') + 'd ago)';
		}
	},
	validateDateIsntFuture: function validateDateIsntFuture(dateStr) {
		return new Promise(function (resolve, reject) {
			if (!moment(dateStr).isValid()) {
				return reject('This is pointless. You\'re not giving me real dates to work with!');
			}
			if (moment().diff(dateStr, 'days') < 0) {
				return reject('You can\'t really search for events which happens in the future, can you silly?');
			}
			resolve(dateStr);
		});
	},

	/**
  * Send messages
  *
  * Slack has a limit on
  * 	1) The number of messages you may post after each other
  * 		(this number is actually 1, but Slack does let you burst
  * 		a couple of messages for a short period of time).
  * 	2) The maximum size of each message
  * 		(16kb. Slack recommends the messages to be limitede to
  * 		4000 characters).
  *
  * To comply with these limits we'll combine messages up to
  * 4000 characters into a single message. Messages are
  * delimited by two linebreaks.
  *
  * @param res
  * @param messages
  */
	sendMessages: function sendMessages(res, messages) {
		var chunkedMessages = [];
		var curCombinedLength = 0;
		var index = 0;

		messages.forEach(function (issue) {
			if (curCombinedLength + issue.length > SLACK_MAX_MESSAGE_SIZE) {
				index = index + 1;
				curCombinedLength = 0;
			}

			if (chunkedMessages[index]) {
				chunkedMessages[index] = chunkedMessages[index] + '\n\n' + issue;
			} else {
				chunkedMessages[index] = issue;
			}

			curCombinedLength = curCombinedLength + issue.length;
		});

		chunkedMessages.forEach(function (message) {
			res.send(message);
		});
	}

};

exports['default'] = utils;
module.exports = exports['default'];