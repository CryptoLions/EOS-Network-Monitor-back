const uniq = require('lodash/uniq');

const {
  StateModelV2,
  AccountModelV2,
  ProducerModelV2,
  TransactionLastHourModelV2,
} = require('../../db');
const { createLogger } = require('../../helpers');

const { error: logError } = createLogger();

const saveBlockData = async ({ transactions, producer }) => {
  if (!transactions || !transactions.length) {
    await StateModelV2.update(
      { id: 1 },
      { $inc: { 'checkedData2.producedBlocks': 1 } },
    ).exec();
    await ProducerModelV2.updateOne({ name: producer }, {
      $inc:
        {
          produced: 1,
          produced_per_day: 1,
          'checkedData.produced': 1,
          'checkedData2.produced': 1,
        },
    }).exec();
    return;
  }

  // update total_txblocks_count
  await StateModelV2
    .update(
      { id: 1 },
      { $inc: {
        total_txblocks_count: 1,
        produced_per_day: 1,
        totalTransactionsCount: transactions.length,
        'checkedData.total_txblocks_count': 1,
        'checkedData.totalTransactionsCount': transactions.length,
        'checkedData2.total_txblocks_count': 1,
        'checkedData2.totalTransactionsCount': transactions.length,
        'checkedData2.producedBlocks': 1,
      } },
    )
    .exec();

  // collect data
  const transactionsInfo = transactions.map(t => t.txInfo);

  const actionsFilter = a => a.action === 'transfer' && a.account !== 'eosio.token';

  const groupByRecipients = (result, a) => ({
    ...result,
    [a.to]: result[a.to] ? result[a.to].concat([a]) : [a],
  });
  const txInfoGroupedByRecipientsOfNewTokens = transactionsInfo
    .filter(actionsFilter)
    .reduce(groupByRecipients, Object.create(null));

  const accountTokensBulkWriteOptionsInObject =
    Object.keys(txInfoGroupedByRecipientsOfNewTokens).reduce((acc, key) => ({
      ...acc,
      [key]: txInfoGroupedByRecipientsOfNewTokens[key].map(txInfo => txInfo.account),
    }), Object.create(null));

  const accountTokensBulkWriteOptions = Object.keys(accountTokensBulkWriteOptionsInObject)
    .map(name => ({
      updateOne: {
        filter: { name },
        update: { $addToSet: { 'tokenData.tokens': { $each: uniq(accountTokensBulkWriteOptionsInObject[name]) } } },
        upsert: true,
      },
    }));

  const accountsToInsert = transactions
    .map(t => {
      if (t.newAccount && t.newAccount.name) {
        return {
          updateOne: {
            filter: { name: t.newAccount.name },
            update: t.newAccount,
            upsert: true,
          },
        };
      }
      return undefined;
    })
    .filter(a => a);

  if (transactionsInfo.length) {
    try {
      await TransactionLastHourModelV2.insertMany(transactionsInfo);
    } catch (e) {
      logError('Error with: TransactionModelV2.insertMany(transactionsInfo);');
      throw e;
    }
  }

  if (accountsToInsert.length) {
    try {
      await AccountModelV2.bulkWrite(accountsToInsert);
    } catch (e) {
      logError('Error with: AccountModelV2.bulkWrite(accountsToInsert);');
      throw e;
    }
  }
  if (accountTokensBulkWriteOptions.length) {
    try {
      await AccountModelV2.bulkWrite(accountTokensBulkWriteOptions);
    } catch (e) {
      logError('Error with: AccountModelV2.bulkWrite(accountTokensBulkWriteOptions);');
      throw e;
    }
  }
  try {
    await ProducerModelV2.updateOne({ name: producer }, {
      $inc:
        {
          tx_count: transactions.length,
          produced: 1,
          produced_per_day: 1,
          'checkedData.tx_count': transactions.length,
          'checkedData.produced': 1,
          'checkedData2.tx_count': transactions.length,
          'checkedData2.produced': 1,
        },
    }).exec();
  } catch (e) {
    logError('Error with: ProducerModelV2.updateOne;');
    throw e;
  }
};

module.exports = saveBlockData;
