'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var SLACK_MAX_MESSAGE_SIZE = 4000;

var moment = require('moment');

var utils = {

	jiraDateStrToMoment: function jiraDateStrToMoment(jiraDateStr) {
		return moment(jiraDateStr, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
	},

	removeLineBreaks: function removeLineBreaks(str) {
		return str.replace(/(\r\n|\n|\r)/gm, ' ');
	},

	printErrToClient: function printErrToClient(err, robot, res) {
		if (typeof err === 'object') {
			if (err.errorMessages) {
				utils.sendMessages(robot, res, 'ERROR: ' + err.errorMessages);
			} else {
				utils.printErrToServer(err);
			}
		} else {
			if (typeof err === 'string') {
				utils.sendMessages(robot, res, 'ERROR: ' + err);
			} else {
				utils.printErrToServer(err);
			}
		}
	},

	printErrToServer: function printErrToServer(err) {
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
				return reject("This is pointless. You're not giving me real dates to work with!");
			}
			if (moment().diff(dateStr, 'days') < 0) {
				return reject("You can't really search for events which happens in the future, can you silly?");
			}
			resolve(dateStr);
		});
	},

	/**
  * Send plain messages
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
  * delimited by a linebreak.
  *
  * @private
  * @param {Object} res Hubot res object
  * @param {String[]} messages
  */
	_sendPlainMessages: function _sendPlainMessages(res, messages) {
		var chunkedMessages = [];
		var curCombinedLength = 0;
		var index = 0;

		messages.forEach(function (message) {
			if (curCombinedLength + message.length > SLACK_MAX_MESSAGE_SIZE) {
				index = index + 1;
				curCombinedLength = 0;
			}

			if (chunkedMessages[index]) {
				chunkedMessages[index] = chunkedMessages[index] + '\n' + message;
			} else {
				chunkedMessages[index] = message;
			}

			curCombinedLength = curCombinedLength + message.length;
		});

		chunkedMessages.forEach(function (message) {
			res.send(message);
		});
	},

	/**
  * Send "attachment" messages
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
  * delimited by a linebreak.
  *
  * @private
  * @param {Object} res Hubot res object
  * @param {String[]} messages
  */
	_sendAttachmentMessages: function _sendAttachmentMessages(robot, res, messages) {
		var chunkedMessages = [];
		var curCombinedLength = 0;
		var index = 0;

		messages.forEach(function (message) {
			var strMessage = JSON.stringify(message);
			if (curCombinedLength + strMessage.length > SLACK_MAX_MESSAGE_SIZE) {
				index = index + 1;
				curCombinedLength = 0;
			}

			if (chunkedMessages[index]) {
				chunkedMessages[index].push(message);
			} else {
				chunkedMessages[index] = [message];
			}

			curCombinedLength = curCombinedLength + strMessage.length;
		});

		chunkedMessages.forEach(function (message) {
			robot.adapter.customMessage({
				channel: res.message.room,
				attachments: message
			});
		});
	},

	/**
  * Send messages to Slack
  *
  * This function check if JSON or not. If all messages are JSON
  * then it posts the messages as "attachments", else it sends them
  * as normal messages.
  *
  * @private
  * @param {Object} robot Hubot robot object
  * @param {Object} res Hubot res object
  * @param {String[]} messages
  */
	sendMessages: function sendMessages(robot, res, messages) {
		// TODO: Also accept objects (which will send as attachments)
		if (typeof messages === 'string') {
			messages = [messages];
		}

		var messagesAttachments = messages.map(function (message) {
			return utils.tryParseJSON(utils.removeLineBreaks(message));
		});
		var isJson = messagesAttachments.every(function (message) {
			return message !== false;
		});

		if (isJson) {
			utils._sendAttachmentMessages(robot, res, messagesAttachments);
		} else {
			utils._sendPlainMessages(res, messages);
		}
	},

	tryParseJSON: function tryParseJSON(jsonString) {
		try {
			var o = JSON.parse(jsonString);
			if (o && typeof o === "object" && o !== null) {
				return o;
			}
		} catch (e) {}

		return false;
	}

};

exports['default'] = utils;
module.exports = exports['default'];