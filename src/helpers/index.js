const { correctBpUrl, correctApiUrl, correctP2PUrl, correctSslUrl } = require('./urlCorrector');

const { createLogger } = require('./logger');

const createEosApi = require('./createEosApi');

const castToInt = require('./castToNumber');

const pickAs = require('./pickAs');

const setSensitiveInterval = require('./setSensitiveInterval');

const watchForServerResources = require('./watchForServerResources');

const { info: logInfo, error: logError } = createLogger();

module.exports = {
  correctBpUrl,
  correctApiUrl,
  correctP2PUrl,
  correctSslUrl,
  createLogger,
  logInfo,
  logError,
  createEosApi,
  eosApi: createEosApi(),
  castToInt,
  pickAs,
  setSensitiveInterval,
  watchForServerResources,
};
