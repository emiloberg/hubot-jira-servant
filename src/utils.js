'use strict';

const SLACK_MAX_MESSAGE_SIZE = 4000;

let moment = require('moment');

const utils = {

	jiraDateStrToMoment(jiraDateStr) {
		return moment(jiraDateStr, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
	},


	removeLineBreaks(str) {
		return str.replace(/(\r\n|\n|\r)/gm, ' ');
	},

	printErrToClient(err, robot, res) {
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

	printErrToServer(err) {
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


	dateToFriendlyDate(dateStr) {
		if (dateStr === moment().format('YYYY-MM-DD')) {
			return 'today';
		} else if (dateStr === moment().subtract(1, 'days').format('YYYY-MM-DD')) {
			return 'yesterday';
		} else {
			return dateStr + ' (' + moment().diff(dateStr, 'days') + 'd ago)';
		}
	},


	validateDateIsntFuture(dateStr) {
		return new Promise(function (resolve, reject) {
			if(!moment(dateStr).isValid()) {
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
	_sendPlainMessages(res, messages) {
		let chunkedMessages = [];
		let curCombinedLength = 0;
		let index = 0;

		messages.forEach(message => {
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

		chunkedMessages.forEach(message => {
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
	_sendAttachmentMessages(robot, res, messages) {
		let chunkedMessages = [];
		let curCombinedLength = 0;
		let index = 0;
		
		messages.forEach(message => {
			let strMessage = JSON.stringify(message); 
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


		chunkedMessages.forEach(message => {
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
	sendMessages(robot, res, messages) {
		// TODO: Also accept objects (which will send as attachments)
		if( typeof messages === 'string' ) {
			messages = [messages];
		}

		let messagesAttachments = messages.map(message => utils.tryParseJSON(utils.removeLineBreaks(message)));
		let isJson = messagesAttachments.every(message => message !== false);

		if(isJson) {
			utils._sendAttachmentMessages(robot, res, messagesAttachments);
		} else {
			utils._sendPlainMessages(res, messages);
		}

	},

	tryParseJSON(jsonString){
		try {
			var o = JSON.parse(jsonString);
			if (o && typeof o === "object" && o !== null) {
				return o;
			}
		} catch (e) {}

		return false;
	}

};

export default utils;

