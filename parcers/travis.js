'use strict';

const START = 'travis_time:start:';
const END = 'travis_time:end:';

const cleaner = /(\?\[\d+\S)|(\?\[\d+\;)|(\?\[\d+m)|(\?\d+m)|(\?\[\d\?)|(\?\[K)|(travis_time\:start\:[0-9a-z]+)/gm;

/**
 * Parses the incoming log string for the last section which
 * in the context of Travic CI is the test output.
 * @param {string} log The log string to parse
 */
module.exports = (log) => {
  const startIndex = log.lastIndexOf(START);
  const endIndex = log.lastIndexOf(END);
  const logSection = log.slice(startIndex, endIndex);

  /**
   * INFO(mperrotte):
   * We're stripping the colour information out of the
   * returned log section to make it more readable.
   */
  return logSection.replace(cleaner, "");
};
