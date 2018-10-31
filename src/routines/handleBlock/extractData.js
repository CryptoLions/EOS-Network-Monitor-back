/* eslint-disable no-mixed-operators */
const flatten = require('lodash/flatten');
const processAction = require('./processAction');
/**
 * @param block
 * @returns {Promise<void>} [{ txInfo, newAccount (if exists) }]
 */
const exctractTransactions = async ({ transactions, block_num, producer }) => flatten(
  await Promise.all(
    transactions.filter(({ trx: { transaction } }) => transaction).map(async ({ trx: { id, transaction } }) => {
      const { actions } = transaction;

      return flatten(await Promise.all(
        actions.map(processAction({ block_num, transaction, id, producer, withSubActions: true })),
      )).filter(e => e);
    }),
  ),
);

module.exports = exctractTransactions;
