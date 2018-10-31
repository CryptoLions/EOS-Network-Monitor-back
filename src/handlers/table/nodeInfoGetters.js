/* eslint-disable no-await-in-loop,no-continue */
const { ProducerModelV2 } = require('../../db');
const { createEosApi } = require('../../helpers');
const {
  SERVER_NOT_FOUND,
  CHECK_URLS,
  CONNECTION_REFUSED_BY_SERVER,
} = require('../../constants');

const processNodeAndGetInfo = async (host, port, name, nodeId, wasEnabled) => {
  const localEosApi = createEosApi({ host, port, isVariable: false, onlyRequest: name === 'eostribeprod' });
  const startTs = Date.now();
  let info;

  try {
    info = await localEosApi.getInfo({});
    if (!wasEnabled && nodeId) {
      ProducerModelV2.updateOne(
        { name, 'nodes._id': nodeId },
        {
          $set: { 'nodes.$.enabled': true },
          $push: { 'nodes.$.downtimes': { to: new Date() } },
        },
      ).exec();
    }
  } catch ({ message, statusCode }) {
    if (
      message.indexOf(CONNECTION_REFUSED_BY_SERVER) > 0
      || message.indexOf(SERVER_NOT_FOUND) > 0
      || statusCode >= 500
    ) {
      if (!wasEnabled) {
        return { checked: { name, isNodeBroken: true, requestTS: startTs, isUpdated: true } };
      }
      if (nodeId) {
        await ProducerModelV2.updateOne(
          { name, 'nodes._id': nodeId },
          {
            $set: { 'nodes.$.enabled': false },
            $push: { 'nodes.$.downtimes': { from: new Date() } },
          },
        ).exec();
      }
    }
    return {
      checked: {
        ping: Date.now() - startTs,
        name,
        responseIsBad: true,
        errorMessage: message,
        statusCode,
        isNode: true,
        isNodeBroken: false,
        requestTS: startTs,
      },
    };
  }
  const nowTs = Date.now();
  const ping = nowTs - startTs;
  const version = info.server_version;
  ProducerModelV2.updateOne({ name }, { lastGoodAnsweredTime: new Date() }).exec();
  return {
    head_block_num: info.head_block_num,
    checked: {
      name,
      ping,
      isNodeBroken: false,
      version,
      answeredBlock: info.head_block_num,
      isNode: true,
      requestTS: startTs,
      isUpdated: true,
      isUnsynced: false,
      responseIsBad: false,
      errorMessage: null,
      statusCode: 200,
    },
  };
};

const getFirstGoodNodeInfo = async nodes => {
  let serverInfo = null;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const { _id, bp_name, enabled } = node;

    for (let j = 0; j < CHECK_URLS.length; j += 1) {
      const type = CHECK_URLS[j];
      const protocol = type.startsWith('https') ? 'https' : 'http';
      const address = node[type];

      if (!address) {
        continue;
      }

      const [host, port] = (address || '').split(':');

      if (!!host && host !== '0.0.0.0') {
        serverInfo = await processNodeAndGetInfo(`${protocol}://${host}`, port, bp_name, _id, enabled);
      }

      if (serverInfo && serverInfo.checked && serverInfo.checked.version) {
        break;
      }
    }
    if (serverInfo && serverInfo.checked && serverInfo.checked.version) {
      break;
    }
  }
  return serverInfo;
};

module.exports = {
  getFirstGoodNodeInfo,
  processNodeAndGetInfo,
};
