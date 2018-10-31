/* eslint-disable no-await-in-loop */
const { NODE_WITH_HISTORY } = require('config');
const { createEosApi, createLogger } = require('../../helpers/index');
const { AccountModelV2 } = require('../../db/index');

const MILLION = 1000 * 1000;

const { info: logInfo, error: logError } = createLogger();

const eosApi = createEosApi(
  NODE_WITH_HISTORY
    ? { host: NODE_WITH_HISTORY.HOST, port: NODE_WITH_HISTORY.PORT, isVariable: false }
    : { host: 'http://history.cryptolions.io', port: '80', isVariable: false },
);

const actionsFilter = a =>
  a.action_trace.act.name === 'transfer'
  && a.action_trace.act.account !== 'eosio.token';

const groupTokenNames = (result, a) => ({
  ...result,
  [a.action_trace.act.account]: true,
});

module.exports = async () => {
  try {
    const accounts = await AccountModelV2.find({}).select('name').exec();
    logInfo(`We have ${accounts.length} accounts`);
    for (let i = 0; i < accounts.length; i += 1) {
      const startTs = Date.now();
      const account = accounts[i];
      const { actions } = await eosApi.getActions(account.name, -1, -MILLION);
      const tokens = Object.keys(
        actions
          .filter(actionsFilter)
          .reduce(groupTokenNames, {}),
      );
      await AccountModelV2.updateOne(
        { name: account.name },
        { $addToSet: { 'tokenData.tokens': { $each: tokens } }, $set: { 'tokenData.tokenSyncedAt': new Date() } },
      );
      if (!tokens.length) {
        logInfo(`${account.name} doesnt have tokens. Time: ${Date.now() - startTs}. Left ${accounts.length - 1 - i}`);
        return;
      }
      logInfo(`Tokens ${tokens.toString()} of ${account.name} were saved. Time: ${Date.now() - startTs}. Left ${accounts.length - 1 - i}`);
    }
  } catch (e) {
    logError('collect accounts tokens error');
    logError(e);
  }
};
