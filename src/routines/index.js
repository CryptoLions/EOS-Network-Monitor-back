const { CronJob } = require('cron');
const fork = require('child_process').fork;
const { connect: connectToDB } = require('../db');
const { CALCULATE_REWARDS_FOR_DAY_INTERVAL } = require('../constants');
const updateProducers = require('./updateProducers');
const updateProducersFast = require('./updateProducersFast');
const checkProducerEndpointsAndSites = require('./checkProducerEndpoints');
const startHandleBlockRoutine = require('./handleBlock');
const cleanTransactionsLastHourCollection = require('./cleanTransactionsLastHourCollection');
const calculateRewardsPerDay = require('./calculateRewardsPerDay');
const resetMissedBlocksForDay = require('./resetMissedBlocksForDay');
const resetProducedTimesForDay = require('./resetProducedTimesForDay');
const fillBlockChartGaps = require('./fillBlockGaps');


const startUpdateProducersRoutine = () => {
  updateProducers();
  return new CronJob({
    cronTime: '*/5 * * * *', // every 5 min
    onTick: updateProducers,
    start: true,
  });
};

const startUpdateProducersFastRoutine = () =>
  new CronJob({
    cronTime: '*/5 * * * * *', // every 5 sec
    onTick: updateProducersFast,
    start: true,
  });

const startCheckProducersSitesRoutine = () => {
  checkProducerEndpointsAndSites();
  return new CronJob({
    cronTime: '*/10 * * * *', // every 10 min
    onTick: checkProducerEndpointsAndSites,
    start: true,
  });
};

const startCleanTransactionsLastHourCollection = () =>
  new CronJob({
    cronTime: '0,15,30,45 * * * *', // every 15 min
    onTick: cleanTransactionsLastHourCollection,
    start: true,
  });

const startCalculateRewardsPerDay = () => {
  calculateRewardsPerDay();
  setInterval(calculateRewardsPerDay, CALCULATE_REWARDS_FOR_DAY_INTERVAL);
};

const startResetMissedBlocksForDay = () =>
  new CronJob({
    cronTime: '0 0 * * *', // every day
    onTick: resetMissedBlocksForDay,
    start: true,
  });

const startResetProducedTimesForDay = () =>
  new CronJob({
    cronTime: '0 0 * * *', // every day
    onTick: resetProducedTimesForDay,
    start: true,
  });

const startFillBlockChartGaps = () => {
  fillBlockChartGaps();
  return new CronJob({
    cronTime: '0/30 * * * *', // every 30 minutes
    onTick: fillBlockChartGaps,
    start: true,
  });
};

let PRODUCERS_PROCESS = 0;
const startCacheImages = () => {
  startProducersCacheDaemon();
  return new CronJob({
    cronTime: '0/30 * * * *', // every 30 minutes
    onTick: () => {
      if (!PRODUCERS_PROCESS){
          startProducersCacheDaemon();
      }
    },
    start: true,
  });
};

function startProducersCacheDaemon(){
        PRODUCERS_PROCESS += 1;
        let forkProcess = fork(__dirname + '/cacheBPSImages/index.js');
        forkProcess.on('close', res => {
              console.log('\x1b[36m%s\x1b[0m', '====== Process Cache images end ======');
              PRODUCERS_PROCESS = 0;
        });
}

const startRoutine = async () => {
  await connectToDB();

  startFillBlockChartGaps();

  startUpdateProducersRoutine();

  startHandleBlockRoutine();

  startCleanTransactionsLastHourCollection();

  startCalculateRewardsPerDay();

  startUpdateProducersFastRoutine();

  startCheckProducersSitesRoutine();

  startResetMissedBlocksForDay();

  startResetProducedTimesForDay();

  startCacheImages();
};

startRoutine();
