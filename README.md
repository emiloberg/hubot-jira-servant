# hubot-jira-servant

Connects Hubot with Jira. 

Made for Slack but should be usable with other interfaces as well. Still a work in progress

### Changed issues commands:
Perfect for answering the question "What happend yesterday?"

* `hubot jira changed` - Get yesterdays changed jira issues
* `hubot jira changed [days]` - Get jira issues changed the passed [days] days.
* `hubot jira changed [date] [date]` - Get jira issues changed the day between [date] and [date]
* `hubot jira changed [date] [days]` - Get jira issues changed between [date] and [days] days before that.
* `hubot jira changed [date]` - Get jira issues changed the day before [date]

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

Start Hubot with these 3 environment variables:

```
JIRA_HOST=your-jira.atlassian.net
JIRA_USER=username
JIRA_PASS=password
```

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
