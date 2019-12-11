/* eslint-disable no-underscore-dangle */
const { EOS: { GET_INFO_API_PATH } } = require('config');
const request = require('request-promise-native');
const flatten = require('lodash/flatten');

const { createLogger, createEosApi } = require('../../helpers');
const { ProducerModelV2 } = require('../../db');

const { error: logError, info: logInfo } = createLogger();

const getEndpoints = ({ nodes }) => flatten(
  nodes
    ? nodes.map(n => {
      const { http_server_address, https_server_address, _id } = n;
      const result = [];
      if (http_server_address && http_server_address.length) {
        const [host, port] = (http_server_address || '').split(':');
        result.push({ host: `http://${host}`, port, _id });
      }
      if (https_server_address && https_server_address.length) {
        const [host, port] = (https_server_address || '').split(':');
        result.push({ host: `https://${host}`, port, _id });
      }
      return result;
    })
    : [],
);

const checkEndpointAvailability = async (url) => {
  try {
    const options = {
      resolveWithFullResponse: true,
      url,
      timeout: 1000 * 60 * 3,
    };
    const { statusCode, statusMessage } = await request(options);
    return statusCode === 200 && statusMessage === 'OK';
  } catch (e) {
    return false;
  }
};

module.exports = async () => {
  try {
    const tsStart = Date.now();
    const producers = await ProducerModelV2
      .find({})
      .sort({ total_votes: -1, name: 1 })
      .select('_id name url nodes._id nodes.http_server_address nodes.https_server_address');

    await Promise.all(producers.map(async p => {
      const isSiteAvailable = await checkEndpointAvailability(p.url);
      const endpoints = await Promise.all(getEndpoints(p).map(async ({ host, port, _id: nodeId }) => {
        try {
          const endpointInfo = await createEosApi({ host, port, isVariable: false }).getInfo();
          return {
            endpoint: `${host}:${port}${GET_INFO_API_PATH}`,
            isWorking: true,
            nodeId,
            server_version: endpointInfo.server_version,
            server_version_string: endpointInfo.server_version_string,
          };
        } catch (e) {
          return {
            endpoint: `${host}:${port}${GET_INFO_API_PATH}`,
            isWorking: false,
            nodeId,
            server_version: null,
            server_version_string: null,
          };
        }
      }));
      const nodes = endpoints.map(e => ({
        _id: e.nodeId,
        server_version: e.server_version,
        server_version_string: e.server_version_string,
      }));
      nodes.forEach(async n => {
        ProducerModelV2.updateOne(
          { _id: p._id, 'nodes._id': n._id },
          { $set: {
            'nodes.$.server_version': n.server_version,
            'nodes.$.server_version_string': n.server_version_string,
          } },
        ).exec();
      });
      await ProducerModelV2.updateOne({ _id: p._id }, { $set: { isSiteAvailable, endpoints } }).exec();
    }));
    logInfo(`Sites and endpoints of producers were checked. Time: ${Date.now() - tsStart}ms`);
  } catch (e) {
    logError(e);
  }
};
