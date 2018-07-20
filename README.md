# Alludeable (allude-able)

## Description
Github app that will comment on PR's if there are failing checks. The comment will contain more context to help the reviewer and author of the PR to handle and sort out the failing checks.

## Prerequesites
### Continuous Integration Tool
It is necessary to have a continuous integration tool setup for the repository that will utilise Alludeable. For this first go-of-it, I choose to work with Travis CI as the build CI.

#### TravisCI
- Sign into TravisCI
- Activate repository
- Add `.travis.yml` file to repository


# Challenge Specific Info
## Approach

## Pain Points
- When a push happens it procs a `check_suite` webhook in the app which has the `action: "requested"`. Seems like this is to let you know that there was a check suite that is about to run. The system will then call out to whom ever is doing the check suite and eventually does get a status return (because the UI updates). This status update however doesn't proc any more webhooks.
> Solution to this is to add the *Commit Status* permission to the Github App (this wasn't evident when I started reading about check suites/runs).

- Was unable to figure out how to get an auth token from the `context.github` client. I'm not sure if I'm missing settings or documentation on method calls, or a paradigm on how to get a token from the user when they first authenticate the Github App with their account / repositories. I was going to use this token with v2 of the TravisCI API in order to retrive build logs in order to parse them
> Solution was me realising that the `target_url` that is returned in the status event doesn't need authentication to view. Furthermore there is a _raw_ version of the logs at `https://api.travis-ci.org/v2/job/{job_id}/log.txt`. This will be how I consume the build job logs.

- `github.pullRequests.getComments` function on the client object did not get the comments for the PR.
> Solution was using the `github.issues.getComments` endpoint instead.
