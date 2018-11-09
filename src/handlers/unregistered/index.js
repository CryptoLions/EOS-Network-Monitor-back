const { LISTENERS: { ON_UNREGISTEREDS_INTERVAL } } = require('config');
const { UnregisteredModel } = require('../../db');
const moment = require('moment');

const initHandler = async () => {
  const listeners = [];

  const getUnregisteredsAndNotify = async () => {
    const unregistereds = await UnregisteredModel
      .find({ unregisteredAt: { $gte: moment().subtract(1, 'days').toDate() } })
      .exec();

    listeners.forEach(listener => listener(unregistereds));
  };

  setInterval(getUnregisteredsAndNotify, ON_UNREGISTEREDS_INTERVAL || 5000);

  return {
    onUpdate(listener) {
      listeners.push(listener);
    },
  };
};

module.exports = initHandler;
