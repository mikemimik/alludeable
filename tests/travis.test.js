'use strict';

// const request = require('request-promise');
const TravisApi = require('../apis/travis');

jest.mock('request-promise', () => {
  const getJobsfixture = {
    jobs: [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ],
  };
  const getLogFixture = {
    content: 'helloworld',
  };
  return jest.fn((options) => {
    if (options.uri.indexOf('build') > -1) {
      return Promise.resolve(getJobsfixture);
    } else if (options.uri.indexOf('log') > -1) {
      return Promise.resolve(getLogFixture);
    } else {
      return null;
    }
  });
});

describe('TravisApi', () => {
  describe('fn:getJobs', () => {
    it('should return a promise', () => {
      const result = TravisApi.getJobs(10);
      expect(typeof result.then).toBe('function');
    });
    it('should resolve to an array', () => {
      return TravisApi.getJobs(10).then((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
    it('should resolve an array of id\'s', () => {
      return TravisApi.getJobs(10).then((result) => {
        expect(result.every((x) => typeof x === 'number')).toBe(true);
      });
    });
  });
  describe('fn:getLogs', () => {
    it('should return a promise', () => {
      const result = TravisApi.getLog(10);
      expect(typeof result.then).toBe('function');
    });
    it('should resolve to a string', () => {
      return TravisApi.getLog(10).then((result) => {
        expect(typeof result).toBe('string');
      });
    });
  });
});
