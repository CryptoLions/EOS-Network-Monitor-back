/* eslint-disable camelcase,no-plusplus,max-len */

const { TransactionLastHourModelV2 } = require('../../db');
const { createLogger } = require('../../helpers');
const { ONE_HOUR } = require('../../constants');

const { info: logInfo, error: logError } = createLogger();

module.exports = async () => {
  try {
    await TransactionLastHourModelV2.remove({
      createdAt: { $lte: new Date(Date.now() - ONE_HOUR) },
    }).exec();
    logInfo('TransactionLastHour collection is cleaned');
  } catch (e) {
    logInfo('TransactionLastHour collection is not cleaned');
    logError(e);
  }
};
