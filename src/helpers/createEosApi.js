const { NODE, RESERVE_NODES, EOS: { GET_INFO_API_PATH } } = require('config');
const EosApi = require('eosjs-api');
const request = require('request-promise-native');

const { info: logInfo } = require('./logger').createLogger();

const getInfoWithRequest = ({ host, port }) => {
  const url = `${host}:${port}${GET_INFO_API_PATH}`;
  const options = {
    url,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Host: `${host}:${port}`,
      'Upgrade-Insecure-Requests': 1,
      'User-Agent': 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    },
    json: true,
    timeout: 80000,
    rejectUnauthorized: false,
  };
  return request(options);
};

const logger = { // Default logging functions
  log: () => {},
  error: () => {},
};

const createEosApi = ({ host = NODE.HOST, port = NODE.PORT, isVariable = true, onlyRequest = false } = {}) => {
  const nodes = [NODE].concat(RESERVE_NODES);

  let currentNodeIndex = 0;
  let eos = EosApi({ httpEndpoint: `${host}:${port}`, logger });

  const changeNode = () => {
    currentNodeIndex += 1;
    if (currentNodeIndex >= nodes.length) {
      currentNodeIndex = 0;
    }
    const currentNode = nodes[currentNodeIndex];
    if (!currentNode) {
      return;
    }
    eos = EosApi({ httpEndpoint: `${currentNode.HOST}:${currentNode.PORT}`, logger });
    logInfo(`Node was changed on ${currentNode.HOST}:${currentNode.PORT}`);
  };

  // wrap every eosApi function
  const eosWrapper = Object.keys(eos).reduce((acc, key) => {
    if (typeof eos[key] === 'function') {
      const eosFunction = async (...args) => {
        const startTs = Date.now();
        const res = await eos[key](...args);
        if ((Date.now() - startTs) > NODE.ALLOWABLE_MAX_PING && isVariable) {
          changeNode();
        }
        return res;
      };
      return {
        ...acc,
        [key]: eosFunction,
      };
    }
    return {
      ...acc,
      [key]: eos[key],
    };
  }, Object.create(null));

  const getInfo = async (args = {}) => {
    try {
      return onlyRequest
        ? getInfoWithRequest({ host, port })
        : eosWrapper.getInfo(args);
    } catch (e) {
      if (isVariable) {
        return getInfo(args);
      }
      return getInfoWithRequest({ host, port });
    }
  };
  return {
    ...eosWrapper,
    getInfo,
  };
};

module.exports = createEosApi;
