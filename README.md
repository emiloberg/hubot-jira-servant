# hubot-jira-servant

Connects Hubot with Jira.

## Made for Slack
Therefore you need to start Hubot with the [Slack adapter](https://www.npmjs.com/package/hubot-slack) to use this plugin. With some modifications it should work with other adapters as well.

## Work in progress
This is very much a work in progress. Currently displaying _changed_ issues (e.g. "what issues was changed yesterday?")  is supported.

## Screenshot

![Screenshot](https://raw.githubusercontent.com/emiloberg/hubot-jira-servant/master/docs/screenshot.png)


## Commands:
Perfect for answering the question "What happend yesterday?"

* `hubot jira changed <project>` - Get yesterdays changed Jira issues
* `hubot jira changed [days] <project>` - Get Jira issues changed the passed [days] days.
* `hubot jira changed [date] [date] <project>` - Get Jira issues changed the day between [date] and [date]
* `hubot jira changed [date] [days] <project>` - Get Jira issues changed between [date] and [days] days before that.
* `hubot jira changed [date] <project>` - Get Jira issues changed the day before [date]

If the project key `<project>` (e.g. `ABC` if you have a project named ABC in Jira) is omitted, the default project (set by the environment variable `HUBOT_JIRA_DEFAULT_PROJECT`) will be used instead.

`[days]` are numbers, e.g. `5` and `[date]` is a string ([the correct way to print dates](https://sv.wikipedia.org/wiki/ISO_8601)), e.g. `2015-03-29`. You may also use `j` for short, e.g. `hubot j changed`.

## Installation

In Hubot root folder, run:

```
npm install hubot-jira-servant --save
```

Then add **hubot-jira-servant** to your `external-scripts.json`:

```json
[
  "hubot-jira-servant"
]
```

Start Hubot with these 4 environment variables:

```
HUBOT_JIRA_HOST=your-jira.atlassian.net # NOTE: No 'http://'
HUBOT_JIRA_USER=username
HUBOT_JIRA_PASS=password
HUBOT_JIRA_DEFAULT_PROJECT=ABC
```
Default project is the project key for your default project, usually a couple of letters before the issue number, e.g. `ABC` in _ABC-123_. If you don't give another project key in your command, e.g. `jira changed  DEF` this is the key being used.

### Optional configuration
Sometimes there are information in Jira which you aren't that interested in. If there are some actions (e.g. the assignee of an issue has been changed) which you don't want Hubot to show you, you may blacklist the actions by adding an environment variable:

``` 
export HUBOT_JIRA_ACTION_BLACKLIST="assignee|rank"
```

The above will make sure that `assignee` or `rank` changes never show. Note the quotation marks, `"` and the pipe, `|`, delimiting multiple entries. The "action" is the wording which goes before the arrow in the output message. In the screenshot above, the actions would be `description`, `Request participants` and `status`.


## Development
This module is developed in EcmaScript 2015. All source files lives in `/src` and gets transpiled into `/dist`. Use provided gulp script (by running `gulp` in the root folder of the module) to start a watcher which automagically transpiles files when they're changed.

### Change message output
To change the message output, you may modify the `changed-issues.hbs` file. This is a [handlebars](handlebarsjs.com) file.

* To see what variables are available to you, check the provided sample json file in `/docs`.
* * All [Swag](https://github.com/elving/swag) Handlebars helpers may be used. E.g. `{{uppercase fields.summary}}`.
* To get a list of all available Jira statuses (used to set the color of the message in the default message), go to: `https://{your-account}.atlassian.net/rest/api/2/status`
* Read more about formatting Slack messages: [https://api.slack.com/docs/formatting](https://api.slack.com/docs/formatting)