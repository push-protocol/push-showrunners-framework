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

import config from '../../config';
import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';

import EPNSGov from './epnsGovChannel';

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

  const dailyRule = new schedule.RecurrenceRule();
  dailyRule.hour = 0;
  dailyRule.minute = 0;
  dailyRule.second = 0;
  dailyRule.dayOfWeek = new schedule.Range(0, 6);

  const tenMinuteRule = new schedule.RecurrenceRule();
  tenMinuteRule.minute = new schedule.Range(0, 59, 10);

  const threeMinuteRule = new schedule.RecurrenceRule();
  tenMinuteRule.minute = new schedule.Range(0, 59, 3);
  //epnsGov send proposal
  logger.info('-- 🛵 Scheduling Showrunner - epnsGov Governance Channel - checkForumProposals() [on 24 Hours]');
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const epnsGov = Container.get(EPNSGov);
    const taskName = 'epnsGov proposal event checks and checkForumProposals()';
    try {
      await epnsGov.checkForumProposals(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  //epnsGov send proposal
  logger.info('-- 🛵 Scheduling Showrunner - epnsGov Governance Channel - checkForumDiscussions() [on 24 Hours]');
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const epnsGov = Container.get(EPNSGov);
    const taskName = 'epnsGov proposal event checks and checkForumDiscussions()';
    try {
      await epnsGov.checkForumDiscussions(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  //epnsGov send proposal
  logger.info('-- 🛵 Scheduling Showrunner - epnsGov Governance Channel - checkActiveProposals() [on 24 Hours]');
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const epnsGov = Container.get(EPNSGov);
    const taskName = 'epnsGov proposal event checks and checkActiveProposals()';
    try {
      await epnsGov.checkActiveProposals(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  //epnsGov send proposal
  logger.info('-- 🛵 Scheduling Showrunner - epnsGov Governance Channel - checkEndingProposals() [on 24 Hours]');
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const epnsGov = Container.get(EPNSGov);
    const taskName = 'epnsGov proposal event checks and checkEndingProposals()';
    try {
      await epnsGov.checkEndingProposals(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
