const pidusage = require('pidusage');
const { createLogger } = require('./logger');

const { info: logInfo } = createLogger();

module.exports = (logPrefix) => {
  const checkResources = () => {
    pidusage(process.pid, (err, stats) => {
      if (err) {
        logInfo(err);
      }
      logInfo(`${logPrefix}: cpu usage: ${stats.cpu}%`, { send: stats.cpu > 100 });
    });
  };

  setInterval(checkResources, 10000);
};
