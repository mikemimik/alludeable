'use strict';

const { Application } = require('probot');

const travisApi = require('../../apis/travis');
const travisParser = require('../../parcers/travis');

const status = require('../../listeners/status');
const failFixture = require('../fixtures/status-failure-test.fixture.json');

jest.mock('../../apis/travis', () => {
  return {
    getJobs: jest.fn(() => [1]),
    getLog: jest.fn(() => 'hello'),
  };
});

jest.mock('../../parcers/travis', () => {
  return jest.fn(() => 'hello');
});

describe('Listener: status', () => {
  let app;
  let github;

  beforeEach(() => {
    app = new Application();
    app.load(status);
    github = {
      pullRequests: {
        getAll: jest.fn(() => {
          const payload = {
            data: [
              {
                head: { sha: failFixture.sha }
              }
            ]
          };
          return Promise.resolve(payload);
        }),
      },
      issues: {
        getComments: jest.fn(() => {
          const payload = {
            data: []
          };
          return Promise.resolve(payload);
        }),
        editComment: jest.fn(),
        createComment: jest.fn(),
      },
    };

    app.auth = () => Promise.resolve(github);
  });

  it('should do things', async () => {
    await app.receive({ event: 'status', payload: failFixture });
    expect(github.pullRequests.getAll).toHaveBeenCalled();
    expect(github.issues.getComments).toHaveBeenCalled();
    expect(github.issues.createComment).toHaveBeenCalled();
    expect(github.issues.editComment).not.toHaveBeenCalled();
  });
});
