/* eslint-disable no-mixed-operators,no-continue,no-await-in-loop,no-param-reassign,no-underscore-dangle */
const {
  PRODUCERS_CHECK_INTERVAL,
  GET_INFO_INTERVAL,
  GET_INFO_TOP21_INTERVAL,
  SAVE_TABLE_INTERVAL,
  LISTENERS: { ON_PRODUCERS_INFO_CHANGE_INTERVAL },
} = require('config');

const { StateModelV2, connect } = require('../../db');

const { logError, logInfo, watchForServerResources } = require('../../helpers');
const { MINIMUM_CHANGED_POSITION_FOR_RELOADING, SECOND } = require('../../constants');
const createStorage = require('./objStorage');
const checkMissedProducing = require('./checkMissedProducing');
const getProducersInfo = require('./getProducersInfo');
const { processNodeAndGetInfo, getFirstGoodNodeInfo } = require('./nodeInfoGetters');


const saveTable = storage => async () => {
  try {
    const table = await storage.getAll();
    StateModelV2.updateOne({ id: 1 }, { table }).exec();
  } catch (e) {
    logError('save table error');
    logError(e);
  }
};

const restoreTable = async storage => {
  try {
    const state = await StateModelV2.findOne({ id: 1 }).select('table');
    if (state && state.table) {
      storage.replaceAll(state.table);
    }
  } catch (e) {
    logError('restore table error');
    logError(e);
  }
};

const initProducerHandler = async () => {
  watchForServerResources('table');
  const producersListForNodeChecking = [];
  const storage = createStorage();
  const serialNumber = {
    top: 0,
    other: 0,
  };

  const previousProducersOrder = [];

  const updateProducersListForNodeChecking = async () => {
    producersListForNodeChecking.length = 0;
    producersListForNodeChecking.push(...await storage.getAll());
  };

  const setCurrentInfo = ({ info }) => {
    storage.updateGeneralInfo(info);
  };

  const checkMissedProducingTime = async () => {
    const top21 = (await storage.getAll()).slice(0, 21);
    storage.updateMissedProducing(checkMissedProducing(top21));
  };

  const notify = (type) => async () => {
    if (type === 'all') {
      process.send({ message: 'all', data: storage.getAll() });
    } else if (type === 'order') {
      process.send({ message: 'order', data: storage.getAll() });
    } else {
      const updated = await storage.getUpdated();
      if (updated.length < 1) {
        return;
      }
      process.send({ message: 'updated', data: updated });
    }
  };
  const notifyOrderChange = notify('order');

  const checkProducers = async () => {
    try {
      const producers = await getProducersInfo();
      //  console.log(producers[0])
      storage.updateProducers(producers);
      const nextProducersOrder = (await storage.getAll()).map(p => p.name);
      const orderIsChanged = nextProducersOrder.find((e, i) => e !== previousProducersOrder[i]);
      if (orderIsChanged) {
        const minimumChangedPosition = nextProducersOrder.reduceRight((prevIndex, e, index) =>
          (e !== previousProducersOrder[index] ? index : prevIndex));
        previousProducersOrder.length = 0;
        previousProducersOrder.push(...nextProducersOrder);
        if (MINIMUM_CHANGED_POSITION_FOR_RELOADING >= minimumChangedPosition) {
          notifyOrderChange();
        }
      }
    } catch (e) {
      logInfo('Data about producers not received');
      logError(e);
    }
  };

  const checkInfo = producersType => async () => {
    try {
      const slicedProducers = producersType === 'top'
        ? producersListForNodeChecking.slice(0, 21)
        : producersListForNodeChecking.slice(21);

      const producers = slicedProducers.filter(e => e.isNode);

      if (!producers.length) {
        return;
      }

      serialNumber[producersType] =
        producers.length <= serialNumber[producersType] ? 1 : serialNumber[producersType] + 1;

      const producer = producers[serialNumber[producersType] - 1];
      if (!producer) {
        return;
      }
      const { nodes, specialNodeEndpoint, name } = producer;

      if (specialNodeEndpoint && specialNodeEndpoint.use) {
        const { host, port } = specialNodeEndpoint;
        try {
          const info = await processNodeAndGetInfo(host, port, name);
          storage.updateNodeInfo(info);
          return;
        } catch (e) {
          logError(`Special endpoint of ${name} does not work`);
        }
      }

      if (!nodes || !nodes.length) {
        return;
      }
      try {
        const info = await getFirstGoodNodeInfo(nodes);
        storage.updateNodeInfo(info);
      } catch (e) {
        logInfo(`Info of ${name} not received`);
      }
    } catch (e) {
      logError(e);
    }
  };
  restoreTable(storage);
  connect();

  setInterval(checkProducers, PRODUCERS_CHECK_INTERVAL);
  setInterval(checkInfo('other'), GET_INFO_INTERVAL);
  setInterval(checkInfo('top'), GET_INFO_TOP21_INTERVAL);
  setInterval(saveTable(storage), SAVE_TABLE_INTERVAL);
  setInterval(checkMissedProducingTime, PRODUCERS_CHECK_INTERVAL);
  setInterval(updateProducersListForNodeChecking, PRODUCERS_CHECK_INTERVAL);

  setInterval(notify('updated'), ON_PRODUCERS_INFO_CHANGE_INTERVAL || SECOND);
  setInterval(notify('all'), ON_PRODUCERS_INFO_CHANGE_INTERVAL || SECOND);

  process.on('message', ({ message, data }) => {
    if (message === 'setCurrentInfo') {
      setCurrentInfo(data);
    }
  });
};

initProducerHandler();
