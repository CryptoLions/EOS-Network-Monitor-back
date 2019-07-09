const crypto = require('crypto');
const difference = require('lodash/difference');
const uniq = require('lodash/uniq');
const { createEosApi, logError } = require('../../helpers');
const { BLACKLIST } = require('config');

const eosApi = createEosApi();

const getBlackList = async () => {
  try {
    const { rows: data } = await eosApi.getTableRows({
      scope: BLACKLIST.scope,
      code: BLACKLIST.scope,
      table: BLACKLIST.table,
      json: true,
      limit: 10000,
    });
    let allAccounts = [];
    data.forEach(e => {
      if (e.action === 'add') {
        allAccounts.push(...e.accounts);
      } else if (e.action === 'remove') {
        allAccounts = difference(allAccounts, e.accounts);
      }
    });
    allAccounts = uniq(allAccounts).sort();
    const str = allAccounts.reduce((r, a) => `${r}actor-blacklist=${a}\n`, '');
    const lastHash = crypto.createHash('sha256').update(str).digest('hex');
    return {
      accounts: allAccounts,
      hashes: data.map(e => e.order_hash),
      tableData: data,
      lastHash,
    };
  } catch (e) {
    logError('get total stacked error');
    logError(e);
    return {};
  }
};

const initTotalStackedHandler = async () => ({
  getBlackList,
});

module.exports = initTotalStackedHandler;
