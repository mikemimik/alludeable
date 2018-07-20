'use strict';

const travisApi = require('../apis/travis');
const logParcer = require('../parcers/travis');

const EVENT_SLUG = 'status';

module.exports = (app) => {
  app.on(EVENT_SLUG, async (context) => {
    // NOTE(mperrotte): execute the state flow for this status event
    const { payload, log: logger } = context;
    const {
      state,
      sha: commit,
      target_url: logUrl,
      commit: {
        html_url: commitUrl,
      },
    } = payload;

    switch (state) {
      case 'pending':
      case 'error': {
        logger.debug(`STATUS:handled.state.${state}`);
      }
      case 'failure':
      case 'success': {
        const isInvolved = await involvement(context);

        if (isInvolved) {
          // INFO(mperrotte): this commitSha is part of a PR, process it
          const log = await fetchLog(context);
          const logSection = logParcer(log);
          const message = composeMessage(commit, logSection, logUrl, commitUrl);
          upsertComment(context, message);
        }
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

  const [buildId] = targetUrl.match(buildParser);
  logger.debug('buildId:', buildId);

  const jobIds = await travisApi.getJobs(buildId);
  if (jobIds.length === 1) {
    const rawLog = await travisApi.getLog(jobIds.pop());
    return rawLog;
  } else {
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
  const { payload, github } = context;
  // INFO(mperrotte): fetch the Pr's
  const pullrequests = await fetchPrs(context);
  const pullrequest = pullrequests.pop();
  const {
    repository: {
      name: repoName,
      owner: {
        login: repoOwner,
      },
    },
  } = payload;
  const commentFetchParams = {
    owner: repoOwner,
    repo: repoName,
    number: pullrequest.number,
  };
  const { data: comments } = await github.issues.getComments(commentFetchParams);
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
    // INFO(mperrotte): the bot has commented already, update existing comment
    const comment = appComments.pop();
    const updateCommentParams = {
      owner: repoOwner,
      repo: repoName,
      comment_id: comment.id,
      body: message,
    };
    const updateComment = await github.issues.editComment(updateCommentParams);
  } else if (appComments.legnth > 1) {
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
    const createComment = await github.issues.createComment(createCommentParams);
    console.log(createComment); // TESTING
  }
  // TODO(mperrotte): figure out what an updated comment looks like

}
