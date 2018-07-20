'use strict';

const request = require('request-promise');

const API = `https://api.travis-ci.org/v3`;

const defaultOptions = {
  json: true,
};

/**
 * TravisApi Class
 *
 * Class level methods for fetching information from the Travis CI API.
 *
 * NOTE(mperrotte):
 * `v3` of the API doesn't require authentication for the endpoints
 * we are using.
 */
class TravisApi {

  /**
   * Fetches the jobs for a bulid number and returns the job id's
   * @param {number} buildId The build number to fetch information about
   */
  static getJobs(buildId) {
    return new Promise(async (resolve, reject) => {
      if (!buildId) { return reject(new Error('missing.param.buildId')); }

      // INFO(mperrotte): craft uri to request info from
      const uri = `${API}/build/${buildId}`;

      // INFO(mperrotte): create options object from defaults
      const options = Object.assign({}, defaultOptions, { uri });

      // INFO(mperrotte): make request to the API
      const payload = await request(options);

      // INFO(mperrotte): parse the job id's out of the return payload
      const jobIds = payload.jobs.reduce((acc, job) => {
        return acc.concat([job.id]);
      }, []);
      return resolve(jobIds);
    });
  }

  /**
   * Fetches the log data for the job id given
   * @param {number} jobId The job number to fetch a log for
   */
  static getLog(jobId) {
    return new Promise(async (resolve, reject) => {
      if (!jobId) { return reject(new Error('missing.param.jobId')); }

      // INFO(mperrotte): craft uri to request info from
      const uri = `${API}/job/${jobId}/log`;

      // INFO(mperrotte): create options option from defaults
      const options = Object.assign({}, defaultOptions, { uri });

      // INFO(mperrotte): make request to the API
      const payload = await request(options);

      // INFO(mperrotte): pull log data out of payload context
      const log = payload.content;
      return resolve(log);
    });
  }
}

module.exports = TravisApi;
