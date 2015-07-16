let moment = require('moment');

let statusToEmoji = {
	'In Production': ':white_check_mark:',
		'In Staging': ':white_check_mark:',
		'In Progress': ':tulip:',
		'Resolved': ':turtle:',
		'Open': ':small_blue_diamond:'
};

const utils = {
	jiraDateStrToMoment(jiraDateStr) {
		return moment(jiraDateStr, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
	},
	removeLineBreaks(str) {
		return str.replace(/(\r\n|\n|\r)/gm,' ');
	},
	statusToEmoji(status) {
		if(statusToEmoji.hasOwnProperty(status)) {
			return statusToEmoji[status];
		} else {
			return status;
		}
	},
	printErr(err) {
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
		process.exit(1);
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
				return reject("That's not a real date")
			}
			if (moment().diff(dateStr, 'days') < 0) {
				return reject("You can't really search for events which happens in the future, can you silly?");
			}
			resolve(dateStr);
		});
	}
};

export default utils;

