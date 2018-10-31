const { connect } = require('../../db');
const collectAccountTokens = require('./index');

const start = async () => {
  await connect();
  collectAccountTokens();
};

start();
