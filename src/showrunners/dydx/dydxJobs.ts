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
import DYDXChannel from './dydxChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const threeHourRule = new schedule.RecurrenceRule();
  threeHourRule.hour = new schedule.Range(0, 23, 3);
  threeHourRule.minute = 0;
  threeHourRule.second = 0;

  const sixHourRule = new schedule.RecurrenceRule();
  sixHourRule.hour = new schedule.Range(0, 23, 6);
  sixHourRule.minute = 0;
  sixHourRule.second = 0;
  const channel = Container.get(DYDXChannel);

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 3hr ]`);
  schedule.scheduleJob({ start: startTime, rule: threeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} snapShotProposalsTask(false)`;
    try {
      channel.snapShotProposalsTask(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 3hr ]`);
  schedule.scheduleJob({ start: startTime, rule: threeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} proposalCreatedTask(false)`;
    try {
      channel.proposalCreatedTask(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 3hr ]`);
  schedule.scheduleJob({ start: startTime, rule: threeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} proposalQueuedTask(false)`;
    try {
      channel.proposalQueuedTask(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 3hr ]`);
  schedule.scheduleJob({ start: startTime, rule: threeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} proposalExecutedTask(false)`;
    try {
      channel.proposalExecutedTask(false);
      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
