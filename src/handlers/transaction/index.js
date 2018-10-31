/* eslint-disable no-param-reassign,no-mixed-operators,no-empty-pattern */
const {
  LISTENERS: { ON_TRANSACTIONS_ADD_INTERVAL },
  USE_CHECKED_DATA,
} = require('config');

const { TransactionLastHourModelV2, StateModelV2 } = require('../../db');
const { castToInt, logError } = require('../../helpers');

const getCountInfo = async () => {
  const state = await StateModelV2
    .findOne({ id: 1 })
    .select(' checkedData2 total_txblocks_count lastHandledBlock totalTransactionsCount');
  // return state && state.total_txblocks_count || 0;
  if (USE_CHECKED_DATA) {
    return {
      notEmptyBlocksCount: (state && state.checkedData2.total_txblocks_count) || 0,
      totalBlockCount: (state && state.lastHandledBlock) || 0,
      totalTransactionsCount: (state && state.checkedData2.totalTransactionsCount) || 0,
    };
  }
  return {
    notEmptyBlocksCount: (state && state.total_txblocks_count) || 0,
    totalBlockCount: (state && state.lastHandledBlock) || 0,
    totalTransactionsCount: (state && state.totalTransactionsCount) || 0,
  };
};

const getTransactions = ({ tsStart, tsEnd, actions, mentionedAccounts }) => {
  const pipeline = [];
  // time
  pipeline.push({ $match: { createdAt: { $gte: new Date(castToInt(tsStart)) } } });
  if (tsEnd) {
    pipeline.push({ $match: { createdAt: { $lte: new Date(castToInt(tsEnd)) } } });
  }
  // actions
  if (actions && actions.length > 1) {
    pipeline.push({ $match: { action: { $in: actions } } });
  } else if (actions && actions.length === 1) {
    pipeline.push({ $match: { action: actions[0] } });
  }
  // accounts
  if (mentionedAccounts && mentionedAccounts.length > 1) {
    pipeline.push({ $match: { mentionedAccounts: { $in: mentionedAccounts } } });
  } else if (mentionedAccounts && mentionedAccounts.length === 1) {
    pipeline.push({ $match: { action: mentionedAccounts[0] } });
  }
  return TransactionLastHourModelV2.aggregate(pipeline);
};

const initHandler = () => {
  const listeners = [];

  const notify = async () => {
    try {
      const transactions = await getTransactions({ tsStart: Date.now() - ON_TRANSACTIONS_ADD_INTERVAL });
      const { notEmptyBlocksCount, totalBlockCount, totalTransactionsCount } = await getCountInfo();
      listeners.forEach(async listener => {
        listener({
          transactions,
          totalTransactionsCount,
          notEmptyBlocksCount,
          totalBlockCount,
        });
      });
    } catch (e) {
      logError(e);
    }
  };

  setInterval(notify, ON_TRANSACTIONS_ADD_INTERVAL);

  return {
    onUpdate(listener) {
      listeners.push(listener);
    },
    getTransactions,
  };
};

module.exports = initHandler;
