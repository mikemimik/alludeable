'use strict';

const fs = require('fs');

const files = fs.readdirSync(`${__dirname}/listeners`, 'utf8');

const listeners = files.reduce((acc, filename) => {
  const listener = require(`./listeners/${filename}`);
  return acc.concat([listener]);
}, []);

module.exports = (app) => {
  listeners.forEach((listener) => {
    listener(app);
  });
};
