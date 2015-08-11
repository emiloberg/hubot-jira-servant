# hubot-jira-servant

Connects Hubot with Jira. 

# WORK IN PROGRESS! But in active development. Wait a few weeks for stable version.

Made for Slack but should be usable with other interfaces as well.

### Changed issues commands:
Perfect for answering the question "What happend yesterday?"

* `hubot jira changed <project>` - Get yesterdays changed Jira issues
* `hubot jira changed [days] <project>` - Get Jira issues changed the passed [days] days.
* `hubot jira changed [date] [date] <project>` - Get Jira issues changed the day between [date] and [date]
* `hubot jira changed [date] [days] <project>` - Get Jira issues changed between [date] and [days] days before that.
* `hubot jira changed [date] <project>` - Get Jira issues changed the day before [date]

If the project key `<project>` (e.g. `ABC` if you have a project named ABC in Jira) is omitted, the default project (set by the environment variable `HUBOT_JIRA_DEFAULT_PROJECT`) will be used instead.

`[days]` are numbers, e.g. `5` and `[date]` is a string ([the correct way to print dates](https://sv.wikipedia.org/wiki/ISO_8601)), e.g. `2015-03-29`. You may also use `j` for short, e.g. `hubot j changed`.

## Installation

In hubot project repo, run:

`npm install hubot-jira-servant --save`

Then add **hubot-jira-servant** to your `external-scripts.json`:

```json
[
  "hubot-jira-servant"
]
```

Install dependenceis:

```
cd node_modules/hubot-jira-servant
npm install
```

Start Hubot with these 4 environment variables:

```
HUBOT_JIRA_HOST=your-jira.atlassian.net
HUBOT_JIRA_USER=username
HUBOT_JIRA_PASS=password
HUBOT_JIRA_DEFAULT_PROJECT=ABC
```
Default project is the project key for your default project, usually a couple of letters before the issue number, e.g. `ABC` in _ABC-123_.

## Sample Interaction

```
user> hubot jira changed
hubot> 
PROJ-1195 Add logic for when renewal is possible
    https://sample-jira.atlassian.net/browse/PROJ-1195
    Emil Öberg
        changed 'status' to 'In Production'
        changed 'resolution' to 'Done'
    Gustav Carlson
        changed 'Epic Link' to 'PROJ-289'        

PROJ-1194 Urgent content translations
    https://sample-jira.atlassian.net/browse/PROJ-1194
    Gustav Carlson
        created the issue

PROJ-1164 Integrate service request with e-payment
    https://sample-jira.atlassian.net/browse/PROJ-1164
    Björn Ryding
        changed 'status' to 'Resolved'
        changed 'summary' to 'Add toggle buttons for the five types (health product, medical devi...'        

PROJ-1161 Build controller for medical device
    https://sample-jira.atlassian.net/browse/PROJ-1161
    Erik Andersson
        changed 'status' to 'In Progress'
```

## Development
This module is developed in EcmaScript 2015. All source files lives in `/src` and gets transpiled into `/dist`. Use provided gulp script (by running `gulp` in the root folder of the module) to start a watcher which automagically transpiles files when they're changed.

### changed-issues.hbs
* To get a list of all available statuses, go to: `https://{your-account}.atlassian.net/rest/api/2/status`
* Read more about formatting Slack messages: [https://api.slack.com/docs/formatting](https://api.slack.com/docs/formatting)