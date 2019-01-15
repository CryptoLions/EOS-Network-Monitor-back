/* eslint-disable no-mixed-operators,no-underscore-dangle */
const { TIMESTAMP_EPOCH } = require('config');

const { ProducerModelV2 } = require('../../db');

const { eosApi, castToInt, pickAs } = require('../../helpers');
const { CHECK_URLS } = require('../../constants');

const calculateEosFromVotes = votes => {
  const date = Date.now() / 1000 - TIMESTAMP_EPOCH;
  const weight = (date / (86400 * 7)) / 52; // 86400 = seconds per day 24*3600
  return castToInt(votes) / 2 ** weight / 10000;
};

const isNode = (producer) => {
  if (!producer || !producer.nodes || !producer.nodes.length) {
    return false;
  }
  return !!producer.nodes.find(n => CHECK_URLS.find(type => n[type] && n[type].length));
};

const convertFieldsFromStringToArr = fields => fields.split(' ').map(s => s.trim()).filter(s => s && s.length);


const getProducersInfo = async () => {
  const { total_producer_vote_weight } = await eosApi.getProducers({ json: true, limit: 1 });
  const onePercent = castToInt(total_producer_vote_weight) / 100;
  const fields =
    `url
      location
      produced
      tx_count
      name
      producer_key
      specialNodeEndpoint
      total_votes
      rewards_per_day
      lastGoodAnsweredTime
      isSiteAvailable
      missedBlocks
      missedBlocksForDay
      missedBlocksForRound
      missedBlocksTotal
      checkedData2
      expectedIncomeData
      endpoints
      blackListHash
      bpData
      nodes
      nodes._id
      nodes.enabled
      nodes.bp_name
      nodes.organisation
      nodes.location
      nodes.http_server_address
      nodes.https_server_address
      nodes.p2p_listen_endpoint
      nodes.p2p_server_address
      nodes.pub_key
      nodes.server_version
      nodes.server_version_string
      nodes.bp
      logoCached
      logo`;
  const producersFromDb = await ProducerModelV2
    .find({ isActive: true, total_votes: { $ne: null } })
    .sort({ total_votes: -1 })
    .select(fields)
    .exec();
  return producersFromDb.map(p => Object.assign(
    Object.create(null),
    {
      ...pickAs(p._doc, [
        ...convertFieldsFromStringToArr(fields),
      ]),
    },
    {
      isNode: isNode(p),
      votesPercentage: p.total_votes / onePercent,
      votesInEOS: calculateEosFromVotes(p.total_votes),
      produced: p.checkedData2.produced,
      tx_count: p.checkedData2.tx_count,
    },
  ));
};

module.exports = getProducersInfo;
