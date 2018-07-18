'use strict';

const START = 'travis_time:start:';
const END = 'travis_time:end:';

module.exports = (log) => {
  const startIndex = log.lastIndexOf(START);
  const endIndex = log.lastIndexOf(END);
  const testLog = log.slice(startIndex, endIndex);
  return testLog;
};
