/* eslint-disable no-mixed-operators */
const flatten = require('lodash/flatten');
const { eosApi, createLogger } = require('../../helpers');
const { AccountModelV2 } = require('../../db');

const { error: logError } = createLogger();

const getBalanceFor = async (name, token) => {
  try {
    return await eosApi.getCurrencyBalance(token, name);
  } catch (e) {
    return undefined;
  }
};

const getBalancesFor = async name => {
  const account = await AccountModelV2.findOne({ name }).select('tokenData.tokens').exec();
  const tokens = account && account.tokenData && account.tokenData.tokens || [];
  const eosBalancePromise = eosApi.getCurrencyBalance('eosio.token', name);
  const otherBalancePromises = tokens.map(t => getBalanceFor(name, t));
  const balances = await Promise.all([eosBalancePromise].concat(otherBalancePromises));
  return flatten(balances).filter(b => b);
};

const initAccountHandler = () => ({
  async getAccount(account_name) {
    try {
      if (!account_name || account_name.length > 13) {
        return {};
      }
      const account = await eosApi.getAccount({ account_name });
      const balances = await getBalancesFor(account_name);
      return { ...account, balance: (balances && balances[0]) || '0.0 EOS', balances: balances.slice(1) };
    } catch (e) {
      logError(e);
      return {};
    }
  },
});

module.exports = initAccountHandler;
