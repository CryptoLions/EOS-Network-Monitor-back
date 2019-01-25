/* eslint-disable no-param-reassign */
const getActionsCount = require('./getActionsCount');
const { createEosApi } = require('../../helpers');
const { SECOND } = require('../../constants');

const eosApi = createEosApi();

const findMaxInfo = async ({ current = { transactions: [] }, previous, max_tps = 0, max_aps = 0 }) => {
  if (!current.block_num){
      return null;
  }
  if (!previous || !previous.block_num) {
    console.log('Not previous');
    previous = await eosApi.getBlock(current.block_num - 1);
  }
  const currentTs = Date.parse(current.timestamp);
  const previousTs = Date.parse(previous.timestamp);
  if (currentTs === previousTs) {
    return undefined;
  }
  let live_tps;
  let live_aps;
  let live_tps_1 = 0;
  let live_aps_1 = 0;
  // the block was produced in one second or more
  if (currentTs - previousTs >= SECOND) {
    const { trxCounter: transactionsNumber, actionsCounter: actionsNumber} = getActionsCount(current);
    const producedInSeconds = (currentTs - previousTs) / SECOND;
    
    live_tps_1 = transactionsNumber / producedInSeconds;
    live_aps_1 = actionsNumber / producedInSeconds;

    console.log('\x1b[36m%s\x1b[0m',`max TPS: ${live_tps}, BLOCK: ${current.block_num}, transactionsNumber = ${transactionsNumber}, actionsNumber = ${actionsNumber}, ${producedInSeconds}`);
  } // else {
    // the block was produced in half of second
    // find number of transactions for 0.5 sec for previous block
    if (!previous.producedInSeconds) {
      console.log('Not producedInSeconds');
      const beforePrevious = await eosApi.getBlock(previous.block_num - 1);
      previous.producedInSeconds = (Date.parse(previous.timestamp) - Date.parse(beforePrevious.timestamp)) / SECOND;
    }
    let currProducedInSec = (Date.parse(current.timestamp) - Date.parse(previous.timestamp)) / SECOND;

    const {trxCounter: prevTrxNumber, actionsCounter: prevActNumber} = getActionsCount(previous);
    const {trxCounter: currTrxNumber, actionsCounter: currActNumber} = getActionsCount(current);
    
    let live_tps_2 =  Math.floor(currTrxNumber / currProducedInSec / 2 + prevTrxNumber / previous.producedInSeconds / 2);
    let live_aps_2 =  Math.floor(currActNumber / currProducedInSec / 2 + prevActNumber / previous.producedInSeconds / 2);

    live_tps = (live_tps_1 > live_tps_2) ? live_tps_1: live_tps_2;
    live_aps = (live_aps_1 > live_aps_2) ? live_aps_1: live_aps_2;

    console.log('\x1b[36m%s\x1b[0m',`max TPS: ${live_tps}, BLOCK: ${current.block_num}, prevTx = ${prevTrxNumber}, currTx = ${currTrxNumber}, prevBlocksDiff = ${previous.producedInSeconds}`);
  //}
  live_aps = live_aps < live_tps ? live_tps : live_aps;
  const res = {};
  if (live_tps > max_tps) {
    res.max_tps = live_tps;
    res.max_tps_block = current.block_num;
  }
  if (live_aps > max_aps) {
    res.max_aps_block = current.block_num;
    res.max_aps = live_aps;
  }
  if (res.max_aps || res.max_tps) {
    return res;
  }
  return undefined;
};

module.exports = findMaxInfo;
