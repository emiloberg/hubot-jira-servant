"use strict";

//Docs Attachments: https://api.slack.com/docs/attachments

//{
//	"attachments": [
//	{
//		"fallback": "Required plain-text summary of the attachment.",
//
//		"color": "#36a64f",
//
//		"pretext": "Optional text that appears above the attachment block",
//
//		"author_name": "Bobby Tables",
//		"author_link": "http://flickr.com/bobby/",
//		"author_icon": "http://flickr.com/icons/bobby.jpg",
//
//		"title": "Slack API Documentation",
//		"title_link": "https://api.slack.com/",
//
//		"text": "Optional text that appears within the attachment",
//
//		"fields": [
//			{
//				"title": "Priority",
//				"value": "High",
//				"short": false
//			}
//		],
//
//		"image_url": "http://my-website.com/path/to/image.jpg",
//		"thumb_url": "http://icons.iconarchive.com/icons/wineass/ios7-redesign/72/Sample-icon.png"
//	}
//]
//}

module.exports = function (robot) {
	robot.respond(/test/i, function (res) {

		var message = {
			channel: res.message.room,
			attachments: [{
				fallback: "New ticket from Andrea Lee - Ticket #1943: Can't rest my password - https://groove.hq/path/to/ticket/1943",
				//pretext: "New ticket from Andrea Lee",
				title: "Ticket #1943: Can't reset my password",
				title_link: "https://groove.hq/path/to/ticket/1943",
				text: "<https://honeybadger.io/path/to/event/|ReferenceError> - UI is not defined",
				//thumb_url: "http://icons.iconarchive.com/icons/wineass/ios7-redesign/72/Sample-icon.png",
				color: "#7CD197",
				fields: [{
					"title": "Project",
					"value": "Awesome Project\nAwesome Project\n<https://honeybadger.io/path/to/event/|Link>\nAwesome *Project* again\nAwesome Project",
					"short": true
				}, {
					"title": "Environment 1",
					"value": "production",
					"short": true
				}, {
					"title": "Environment 2",
					"value": "production",
					"short": true
				}, {
					"title": "Environment3",
					"value": "production",
					"short": true
				}, {
					"title": "Environment 4",
					"value": "production",
					"short": true
				}, {
					"title": "Environment 5",
					"value": "production",
					"short": true
				}, {
					"title": "Long stuff",
					"value": "Compellingly aggregate multidisciplinary ROI without client-focused experiences. Objectively conceptualize transparent e-services whereas resource sucking web services. Distinctively promote low-risk high-yield interfaces rather than accurate action items. ",
					"short": false
				}]
			}, {
				fallback: "New ticket from Andrea Lee - Ticket #1943: Can't rest my password - https://groove.hq/path/to/ticket/1943",
				//pretext: "New ticket from Andrea Lee",
				title: "Ticket #1943: Can't reset my password",
				title_link: "https://groove.hq/path/to/ticket/1943",
				text: "Help! I tried to reset my password but nothing happened!",
				color: "#7CD197"
			}]
		};

		robot.adapter.customMessage(message);
	});
};