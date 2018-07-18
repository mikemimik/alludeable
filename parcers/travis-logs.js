'use strict';

const START = 'travis_time:start:';
const END = 'travis_time:end:';

const cleaner = /(\?\[0K)|(\?\[\d+\;)|(\?\[\d+m)|(\?\d+m)|(travis_time\:start\:[0-9a-z]+)/gm;

module.exports = (log) => {
  const startIndex = log.lastIndexOf(START);
  const endIndex = log.lastIndexOf(END);
  const logSection = log.slice(startIndex, endIndex);

  return logSection.replace(cleaner, "");
};
