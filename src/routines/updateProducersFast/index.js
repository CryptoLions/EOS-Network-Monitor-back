/* eslint-disable camelcase,no-plusplus,max-len */
const differenceBy = require('lodash/differenceBy');
const { eosApi, createLogger } = require('../../helpers');
const { ProducerModelV2, UnregisteredModel } = require('../../db');

const SETTLED_PRODUCERS_COUNT = 200;

const { info: logInfo, error: logError } = createLogger();

module.exports = async () => {
  try {
    const { rows } = await eosApi.getProducers({ json: true, limit: 1000 });
    const producers = rows.slice(0, SETTLED_PRODUCERS_COUNT);
    await UnregisteredModel.updateMany(
      { name: { $in: producers.map(p => p.owner) }, reregisteredTs: { $eq: null } },
      { reregisteredTs: new Date() },
    ).exec();
    const unregistereds = await ProducerModelV2
      .find({ isActive: true, name: { $nin: producers.map(p => p.owner) } })
      .select('name isActive')
      .exec();
    const existedUnregistereds = await UnregisteredModel.find({ reregisteredTs: { $eq: null } }).exec();
    const newUnregistereds = differenceBy(unregistereds, existedUnregistereds, 'name');
    if (newUnregistereds && newUnregistereds.length) {
      newUnregistereds.forEach(u => new UnregisteredModel({ name: u.name, unredirectedAt: new Date() }).save());
    }
    const producersBulkWriteOptions = producers.map(p => ({
      updateOne: {
        filter: { name: p.owner },
        update: { total_votes: p.total_votes, unpaid_blocks: p.unpaid_blocks, isActive: true },
      },
    }));
    await ProducerModelV2.bulkWrite(producersBulkWriteOptions);
    await ProducerModelV2.updateMany({ name: { $nin: producers.map(p => p.owner) } }, { isActive: false }).exec();
    logInfo('producers positions updated');
  } catch (e) {
    logError(e);
  }
};
