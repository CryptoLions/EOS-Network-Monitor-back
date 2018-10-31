const { connect } = require('../../db');
const updateTransactions = require('./index');

const start = async () => {
  await connect();
  updateTransactions();
};

start();
