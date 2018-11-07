/* eslint-disable no-param-reassign */
const {
  BLACK_PRODUCERS_LIST,
  ALLOWABLE_NON_SYNCHRONIZED_DIFFERENCE_IN_BLOCKS,
} = require('config');
const { castToInt, pickAs } = require('../../helpers');

const sort = rows => {
  const result = [...rows].filter(e => e.totalVotes);
  result.sort((a, b) => castToInt(b.totalVotes) - a.totalVotes);
  return result;
};

const createStorage = () => {
  let storage = Object.create(null);
  let updated = Object.create(null);
  let lastGoodBlockNumber = 0;
  let currentProducerName = '';

  const updateNodeInfo = ({ checked, head_block_num }) => {
    if (
      head_block_num &&
      head_block_num + ALLOWABLE_NON_SYNCHRONIZED_DIFFERENCE_IN_BLOCKS < lastGoodBlockNumber
    ) {
      checked = {
        ...checked,
        isUnsynced: true,
      };
    }
    storage[checked.name] = {
      ...storage[checked.name],
      ...checked,
      answeredTimestamp: Date.now(),
    };
    updated[checked.name] = {
      ...storage[checked.name],
    };
  };
  const updateMissedProducing = (top21) => {
    top21.forEach(e => {
      storage[e.name] = {
        ...storage[e.name],
        ...e,
      };
    });
  };

  const updateProducers = (producers) => {
    const transformedProducers = producers
      .map(p => pickAs(p, [
        'name',
        'produced',
        'tx_count',
        'votesPercentage',
        'votesInEOS',
        'blackListHash',
        'isNode',
        'bpData',
        'nodes',
        'specialNodeEndpoint',
        'rewards_per_day',
        'lastGoodAnsweredTime',
        'isSiteAvailable',
        'missedBlocks',
        'missedBlocksForDay',
        'missedBlocksForRound',
        'missedBlocksTotal',
        'checkedData2',
        'endpoints',
        'expectedIncomeData',
        {
          totalVotes: 'total_votes',
          organizationUrl: 'url',
          key: 'producer_key',
        },
      ]))
      .filter(p => !BLACK_PRODUCERS_LIST.find(b => b.key === p.key));

    const newStorage = {};
    sort(transformedProducers).forEach(e => {
      newStorage[e.name] = {
        ...storage[e.name],
        ...e,
      };
    });
    storage = newStorage;
  };

  const updateGeneralInfo = (info) => {
    if (lastGoodBlockNumber >= info.head_block_num) {
      return;
    }
    lastGoodBlockNumber = info.head_block_num;
    if (storage[currentProducerName] && storage[currentProducerName].name !== info.head_block_producer) {
      storage[currentProducerName] = {
        ...storage[currentProducerName],
        isCurrentNode: false,
        isUpdated: true,
      };
      updated[storage[currentProducerName].name] = {
        ...storage[currentProducerName],
      };
    }
    if (storage[info.head_block_producer]) {
      storage[info.head_block_producer] = {
        ...storage[info.head_block_producer],
        isCurrentNode: true,
        isNode: true,
        isUpdated: true,
        producedBlock: info.head_block_num,
        producedTimestamp: Date.parse(info.head_block_time),
      };
      updated[info.head_block_producer] = {
        ...storage[info.head_block_producer],
      };
    }
    currentProducerName = info.head_block_producer;
  };

  const getAll = () => Object.values(storage);
  const getUpdated = () => {
    Object.values(storage).forEach(e => {
      e.isUpdated = false;
    });
    const result = Object.values(updated);
    updated = {};
    return result;
  };
  const replaceAll = table => {
    storage = table.reduce((res, val) => ({
      ...res, [val.name]: val,
    }), Object.create(null));
  };

  return {
    updateNodeInfo,
    updateMissedProducing,
    updateProducers,
    updateGeneralInfo,
    replaceAll,
    getAll,
    getUpdated,
  };
};

module.exports = createStorage;
