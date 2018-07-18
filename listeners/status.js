'use strict';

const travisApi = require('../apis/travis');
const logParcer = require('../parcers/travis-logs');

const EVENT_SLUG = 'status';
const buildParser = /\d+/;

const stateHandlers = {
  error: async (context) => {
    const { log: logger } = context;
    logger.debug('STATUS:handled.state.error');
  },
  pending: async (context) => {
    const { log: logger } = context;
    logger.debug('STATUS:handled.state.pending');
  },
  failure: async (context) => {
    const { payload, log: logger, github } = context;
    const isInvolved = await involvement(context);

    if (isInvolved) {
      // INFO(mperrotte): this commitSha is part of a PR, process it
      const logSection = await fetchLog(context);
      findOrCreateComment(context, logSection);
      // TODO(mperrotte): parse the log file to get string for comment
      // TODO(mperrotte): pass data along to function to post comment
    }
  },
  success: async (context) => {
    const { payload, log: logger } = context;
    const { target_url: targetUrl } = payload;
    const [buildId] = targetUrl.match(buildParser);
    logger.debug('buildId:', buildId);
  },
};

module.exports = (app) => {
  app.on(EVENT_SLUG, async (context) => {
    // NOTE(mperrotte): execute state handler for this status event
    const { payload, log: logger } = context;
    const { state } = payload;

    const handler = stateHandlers[state];
    if (handler) {
      logger.debug(`execute.handler.${state}`);
      handler(context);
    }
  });
};

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

async function involvement(context) {
  const { payload } = context;
  const { sha: commitSha } = payload;
  const pullrequests = await fetchPrs(context);
  const involvedPrs = pullrequests.filter((pr) => pr.head.sha === commitSha);
  return !!involvedPrs.length;
}

async function fetchLog(context) {
  const { payload, log: logger } = context;
  const { target_url: targetUrl } = payload;

  const [buildId] = targetUrl.match(buildParser);
  logger.debug('buildId:', buildId);

  const jobIds = await travisApi.getJobs(buildId);
  if (jobIds.length === 1) {
    const rawLog = await travisApi.getLog(jobIds.pop());
    const logSection = logParcer(rawLog);
    logger.debug(logSection); // TESTING
    return logSection;
  } else {
    // TODO(mperrotte): handle multiple job ids
    // TODO(mperrotte): filter for failing job
    return '';
  }
}

async function findOrCreateComment(context, message) {
  const { payload, github } = context;
  const pullrequests = await fetchPrs(context);
  const pullrequest = pullrequests.pop();
  console.log(pullrequest);
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
  console.log(comments); // TESTING
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
    console.log(updateComment); // TESTING
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
