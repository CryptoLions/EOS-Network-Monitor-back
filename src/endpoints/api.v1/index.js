/* eslint-disable max-len */
const { API_PREFIX, NODE_WITH_HISTORY, VERSION } = require('config');
const request = require('request-promise-native');
const requestMain = require('request');
const processAction = require('../../routines/handleBlock/processAction');

const { BLOCK_CHART_PERIOD } = require('../../constants');

const { TransactionModelV2, ProducerModelV2, BlockModelV2 } = require('../../db');

const init = ({ app, handlers }) => {
  const {
    table: tableHandler,
    info: infoHandler,
    account: accountHandler,
    transaction: transactionHandler,
    ram: ramHandler,
    theblacklist: theblacklistHandler,
  } = handlers;
  app.get(`${API_PREFIX}/table/`, async (req, res) => {
    try {
      const table = await tableHandler.getAll();
      res.status(200).send(table);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/blocks/:number/`, async (req, res) => {
    try {
      const { number } = req.params;
      const block = await infoHandler.getBlockInfo(number);
      res.status(200).send(block);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/accounts/:name/`, async (req, res) => {
    try {
      const { name } = req.params;
      const account = await accountHandler.getAccount(name);
      res.status(200).send(account);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/accounts/:name/history/`, async (req, res) => {
    try {
      const { name } = req.params;
      const { skip = 0, limit = 10 } = req.query;
      const response = await request({
        url: `http://history.cryptolions.io/v1/history/get_actions/${name}?skip=${skip}&offset=${limit}`,
        json: true,
      });
      const correctedHistory = await Promise.all(response.actions.map(async action => {
        const { trx_id, block_num, createdAt } = action;
        return (await processAction({ block_num, transaction: { expiration: createdAt }, id: trx_id })(response.actions[0].act)).txInfo;
      }));
      res
        .set('count', response.actionsTotal)
        .status(200)
        .send(correctedHistory);
    } catch (e) {
      res.set('count', 0).status(200).send([]);
    }
  });
  app.get(`${API_PREFIX}/transactions/:txid/`, async (req, res) => {
    const { txid } = req.params;
    requestMain.get(`${NODE_WITH_HISTORY.HOST}:${NODE_WITH_HISTORY.PORT}/v1/history/get_transaction/${txid}`).pipe(res);
    /*try {
      const tx = await TransactionModelV2.findOne({ txid });
      res.status(200).send(tx);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }*/

  });
  app.get(`${API_PREFIX}/transactions/`, async (req, res) => {
    try {
      const now = Date.now();
      const { tsStart = now - 1000, tsEnd, actions, mentionedAccounts } = req.query;
      const correctedActions = actions && actions.split(',');
      const correctedMentionedAccounts = mentionedAccounts && mentionedAccounts.split(',');
      const history = await transactionHandler.getTransactions({
        tsStart,
        tsEnd,
        actions: correctedActions,
        mentionedAccounts: correctedMentionedAccounts,
      });
      res.status(200).send(history);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/p2p/:type`, async (req, res) => {
    const { type } = req.params;
    const p2pFieldName = type === 'endpoints' ? 'p2p_listen_endpoint' : 'p2p_server_address';
    try {
      const pipline = [
        { $match: { nodes: { $ne: null } } },
        { $unwind: '$nodes' },
        { $match: {
          [`nodes.${p2pFieldName}`]: { $ne: null },
        } },
        { $group: { _id: '$name', p2p: { $push: `$nodes.${p2pFieldName}` }, total_votes: { $first: '$total_votes' } } },
        { $sort: { total_votes: -1 } },
        { $project: { name: '$_id', p2p: 1, _id: 0 } },
      ];
      const endpoints = await ProducerModelV2.aggregate(pipline);
      res.status(200).send(endpoints);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get(`${API_PREFIX}/block-chart`, async (req, res) => {
    try {
      const { from = Date.now() - BLOCK_CHART_PERIOD, to = Date.now() } = req.query;
      const pipline = [
        { $match: { timestamp: { $gt: from, $lt: to } } },
        { $sort: { blockNumber: 1 } },
      ];
      const chart = await BlockModelV2.aggregate(pipline);
      res.status(200).send(chart);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/on-chain`, async (req, res) => {
    try {
      const pipline = [
        { $match: {
          logo: { $ne: null },
          candidateName: { $ne: null },
          name: { $ne: null },
          url: { $ne: null },
          'contacts.email': { $ne: null },
          location: { $ne: null },
        } },
        { $project: {
          logo: 1,
          candidateName: 1,
          name: 1,
          url: 1,
          email: '$contacts.email',
          location: 1,
        },
        },
      ];
      const onChain = await ProducerModelV2.aggregate(pipline);
      res.status(200).send(
        onChain.map(e => ({ ...e, bpJsonUrl: `${e.url}/bp.json` })),
      );
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/ram`, async (req, res) => {
    try {
      const { from, to, frequencyInMinutes } = req.query;
      const history = await ramHandler.getRamHistory({ from, to, frequencyInMinutes });
      res.status(200).send(history);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/theblacklist/`, async (req, res) => {
    try {
      const blackList = await theblacklistHandler.getBlackList();
      res.status(200).send(blackList);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/chain/:producerName/bp`, async (req, res) => {
    try {
      const { producerName } = req.params;
      const producer = await ProducerModelV2
        .findOne({ name: producerName })
        .select('bpData')
        .exec();
      if (!producer || !producer.bpData) {
        res.status(200).send({});
        return;
      }
      res.status(200).send(producer.bpData);
    } catch (e) {
      res.status(500).send('Internal Server Error');
    }
  });
  app.get(`${API_PREFIX}/version`, async (req, res) => {
    res.json({ version: VERSION });
  });
};

module.exports = init;
