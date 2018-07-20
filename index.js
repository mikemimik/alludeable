'use strict';

const fs = require('fs');

// INFO(mperrotte): read the listeners directory
const files = fs.readdirSync(`${__dirname}/listeners`, 'utf8');

/**
 * INFO(mperrotte):
 * Iterate over all the files from the listeners directory
 * and build an array of functions.
 */
const listeners = files.reduce((acc, filename) => {
  const listener = require(`./listeners/${filename}`);
  return acc.concat([listener]);
}, []);

/**
 * Main exported function for probot to consume
 * @param {App} app The app passed in by probot
 */
module.exports = (app) => {

  /**
   * INFO(mperrotte):
   * loop array of functions and pass app context into
   * each of the listener functions.
   */
  listeners.forEach((listener) => {
    listener(app);
  });
};
