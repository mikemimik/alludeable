'use strict';

const request = require('request-promise');

const API = `https://api.travis-ci.org/v3`;

const defaultOptions = {
  json: true,
};

class TravisAPI {
  static getJobs(buildId) {
    return new Promise(async (resolve, reject) => {
      if (!buildId) { return reject(new Error('missing.param.buildId')); }
      const uri = `${API}/build/${buildId}`;
      const options = Object.assign({}, defaultOptions, { uri });
      const payload = await request(options);
      const jobIds = payload.jobs.reduce((acc, job) => {
        return acc.concat([job.id]);
      }, []);
      return resolve(jobIds);
    });
  }

  static getLog(jobId) {
    return new Promise(async (resolve, reject) => {
      if (!jobId) { return reject(new Error('missing.param.jobId')); }
      const uri = `${API}/job/${jobId}/log`;
      const options = Object.assign({}, defaultOptions, { uri });
      const payload = await request(options);
      const log = payload.content;
      return resolve(log);
    });
  }
}

module.exports = TravisAPI;
