// Do Scheduling
// https://github.com/node-schedule/node-schedule
// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
// Execute a cron job every 5 Minutes = */5 * * * *
// Starts from seconds = * * * * * *

import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';
import { BancorChannel } from './bancorChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const sixHourRule = new schedule.RecurrenceRule();
  sixHourRule.hour = new schedule.Range(0, 23, 6);
  sixHourRule.minute = 0;
  sixHourRule.second = 0;

  logger.info(`[${new Date(Date.now())}] -- 🛵 Scheduling Showrunner - Bancor Channel `);

  schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {
    const channel = Container.get(BancorChannel);
    const taskName = `${channel.cSettings.name} event checks and poolProgramAddedTask(false)`;

    try {
      channel.poolProgramAddedTask(false);
      logger.info(`[${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);

      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });

  schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {
    const channel = Container.get(BancorChannel);
    const taskName = `${channel.cSettings.name} event checks and snapShotProposalsTask(false)`;

    try {
      channel.snapShotProposalsTask(false);
      logger.info(`[${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);

      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });

  schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {
    const channel = Container.get(BancorChannel);
    const taskName = `${channel.cSettings.name} event checks and newTokenListingsTask(false)`;

    try {
      channel.newTokenListingsTask(false);
      logger.info(`[${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);

      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
