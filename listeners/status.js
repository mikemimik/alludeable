'use strict';

const travisApi = require('../apis/travis');
const logParcer = require('../parcers/travis');

const EVENT_SLUG = 'status';

module.exports = (app) => {
  app.on(EVENT_SLUG, async (context) => {
    const { payload, log: logger } = context;
    const {
      state,
      sha: commit,
      target_url: logUrl,
      commit: {
        html_url: commitUrl,
      },
    } = payload;

    // INFO(mperrotte): execute the state flow for this status event
    switch (state) {
      case 'pending':
      case 'error': {
        logger.debug(`STATUS:handled.state.${state}`);
        break;
      }
      case 'failure':
      case 'success': {

        // INFO(mperrotte): determine if this context is involed in a PR
        const isInvolved = await involvement(context);

        if (isInvolved) {
          // INFO(mperrotte): the commit in this context is part of a PR, process it
          // INFO(mperrotte): fetch the logs for this commit from the provider
          const log = await fetchLog(context);

          /**
           * NOTE(mperrotte):
           * If log is an empty string that means we got some values we weren't
           * expecting from `fetchLog`. We should fail gracefully by bailing
           */
          if (log !== '') {
            // INFO(mperrotte): parce out the section of log we care about
            const logSection = logParcer(log);

            // INFO(mperrotte): create a message to post as the comment on the PR
            const message = composeMessage(commit, logSection, logUrl, commitUrl);

            // INFO(mperrotte): create or update a comment on the PR
            upsertComment(context, message);
          }
        }
        break;
      }
      default: {
        logger.debug(`STATUS:handled.state.${state}`);
      }
    }
  });
};

/**
 * Fetches all open PR for the owner and repo in the context
 * @param {Context} context The context object
 */
async function fetchPrs(context) {
  const { payload, github } = context;
  const {
    repository: {
      name: repoName,
      owner: {
        login: repoOwner,
      },
    },
  } = payload;
  const prFetchParams = {
    owner: repoOwner,
    repo: repoName,
    state: 'open',
  };
  const { data: pullrequests } = await github.pullRequests.getAll(prFetchParams);
  return pullrequests;
}

/**
 * Determines if the commit in the context is part of any PR's
 * @param {Context} context The context object
 */
async function involvement(context) {
  const { payload } = context;
  const { sha: commitSha } = payload;
  const pullrequests = await fetchPrs(context);
  const involvedPrs = pullrequests.filter((pr) => pr.head.sha === commitSha);
  return !!involvedPrs.length;
}

/**
 * Fetches the log file for the commit from the build CI
 * @param {Context} context The context object
 */
async function fetchLog(context) {
  const { payload, log: logger } = context;
  const { target_url: targetUrl } = payload;
  const buildParser = /\d+/;

  // INFO(mperrotte): parse the build ID out of the target url
  // NOTE(mperrotte): `.match` returns an array, first element we want
  const [buildId] = targetUrl.match(buildParser);
  logger.debug('buildId:', buildId);

  // INFO(mperrotte): get jobs for this build ID
  const jobIds = await travisApi.getJobs(buildId);
  if (jobIds.length === 1) {

    // INFO(mperrotte): found 1 job, all this are well, continue
    const rawLog = await travisApi.getLog(jobIds.pop());
    return rawLog;
  } else {
    logger.debug('error.from.getJobs');
    // INFO(mperrotte): we found 0 or > 1 jobs, bail; gracefully
    // TODO(mperrotte): handle multiple job ids
    // TODO(mperrotte): filter for failing job
    return '';
  }
}

/**
 * Composes the message together with a header and the
 * Url's provided to create the message to post as a comment
 * @param {string} commit The commit sha
 * @param {string} message The message to compose
 * @param {string} logUrl The url for the build logs
 * @param {string} commitUrl The url for the commit
 */
function composeMessage(commit, message, logUrl, commitUrl) {
  const header = `### The [CI build](${logUrl}) for commit: <code>[${commit.slice(0, 6)}](${commitUrl})</code>`;

  return `${header}\n${message}`;
}

/**
 * Creates or updates a comment on the PR for this context
 * @param {Context} context The context object
 * @param {string} message The message to post as the comment on the PR
 */
async function upsertComment(context, message) {
  const { payload, github, log: logger } = context;
  const {
    sha: commit,
    repository: {
      name: repoName,
      owner: {
        login: repoOwner,
      },
    },
  } = payload;

  // INFO(mperrotte): fetch open PR's
  const pullrequests = await fetchPrs(context);

  // INFO(mperrotte): filter the PR's for the one this commit is part of
  const pullrequest = pullrequests.filter((pr) => pr.head.sha === commit).pop();
  const commentFetchParams = {
    owner: repoOwner,
    repo: repoName,
    number: pullrequest.number,
  };

  // INFO(mperrotte): fetch all comments for this PR
  /**
   * NOTE(mperrotte):
   * We're using the `issues` endpoint to get the comments as the `pullRequests`
   * endpoint does not return the comments for some reason.
   */
  const { data: comments } = await github.issues.getComments(commentFetchParams);

  // INFO(mperrotte): filter all the comments for the one this bot posted
  const appComments = comments.filter((comment) => {
    const {
      user: {
        login: name,
        type,
      },
    } = comment;
    if (name === 'alludeable[bot]' && type === 'Bot') {
      return true;
    }
    return false;
  });

  if (appComments.length === 1) {
    // INFO(mperrotte): found a comment from this bot, continue
    const comment = appComments.pop();

    // INFO(mperrotte): the bot has commented already, update existing comment
    const updateCommentParams = {
      owner: repoOwner,
      repo: repoName,
      comment_id: comment.id,
      body: message,
    };
    await github.issues.editComment(updateCommentParams);
  } else if (appComments.legnth > 1) {

    // INFO(mperrotte): found more than one comment from the bot? uh oh, we should bail
    // NOTE(mperrotte): somehow the bot commented twice on this PR (error)
    // TODO(mperrotte): make this edge case impossible
  } else {

    // INFO(mperrotte): the bot hasn't commented yet, create a new comment
    const createCommentParams = {
      owner: repoOwner,
      repo: repoName,
      number: pullrequest.number,
      body: message,
    };
    await github.issues.createComment(createCommentParams);
  }
}
