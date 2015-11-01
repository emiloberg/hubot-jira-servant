# hubot-jira-servant changelog

### Verson 1.2.0

* As the Handlebars template is used to create a JSON (which is sent to Slack), there's now the Handlebars helper `safe` which will escape `"` and `\`. If you've customized the Handlebars template, please add the helper when printing variables. E.g. change `{{fields.summary}}` to `{{safe fields.summary}}`. Take a look at `changed-issues.hbs` for the default template.

* Tabs in Jira responses are removed

Thanks [Marc Abramowitz](https://github.com/msabramo) for all of the above.
