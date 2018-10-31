/* eslint-disable camelcase,no-plusplus,max-len */
/* ###############################################################################
#
# EOS TestNet Monitor
#
# Created by http://CryptoLions.io
#
# Git Hub: https://github.com/CryptoLions/EOS-Testnet-monitor
#
###############################################################################  */

const { eosApi, createLogger } = require('../../helpers');
const handleData = require('./handleData');

const { info: logInfo, error: logError } = createLogger();

module.exports = async () => {
  try {
    const producersSystem = await eosApi.getProducers({ json: true, limit: 1000 });
    await handleData(producersSystem.rows);
    logInfo('producers info updated');
  } catch (e) {
    logError(e);
  }
};
