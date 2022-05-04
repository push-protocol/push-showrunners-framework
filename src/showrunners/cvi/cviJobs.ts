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
import CviChannel from './cviChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const threeHourRule = new schedule.RecurrenceRule();
  threeHourRule.hour = new schedule.Range(0, 23, 3);
  threeHourRule.minute = 0;
  threeHourRule.second = 0;

  const fiveSecRule = new schedule.RecurrenceRule();
  fiveSecRule.second = new schedule.Range(0, 0, 0, 5);

  const twoAndHalfMinRule = new schedule.RecurrenceRule();
  twoAndHalfMinRule.minute = new schedule.Range(0, 59, 2);
  twoAndHalfMinRule.second = 30;

  const tenMinuteRule = new schedule.RecurrenceRule();
  tenMinuteRule.minute = new schedule.Range(0, 59, 10);

  const thirtyMinuteRule = new schedule.RecurrenceRule();
  thirtyMinuteRule.minute = new schedule.Range(0, 59, 30);

  const oneHourRule = new schedule.RecurrenceRule();
  oneHourRule.hour = new schedule.Range(0, 23);
  oneHourRule.minute = 0;
  oneHourRule.second = 0;

  const dailyRule = new schedule.RecurrenceRule();
  dailyRule.hour = 0;
  dailyRule.minute = 0;
  dailyRule.second = 0;
  dailyRule.dayOfWeek = new schedule.Range(0, 6);

  const sixHourRule = new schedule.RecurrenceRule();
  sixHourRule.hour = new schedule.Range(0, 23, 6);
  sixHourRule.minute = 0;
  sixHourRule.second = 0;

  logger.info('-- 🛵 Scheduling Showrunner - Proof Of Humanity Channel [on 3hr ]');
  schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {
    const channel: CviChannel = Container.get(CviChannel);
    const taskName = `${channel.cSettings.name} checkForLiquidationRisks`;
    try {
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
      await channel.checkForLiquidationRisks(false);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const cvi: CviChannel = Container.get(CviChannel);
    const taskName = 'CVI Channel checkWeeklyVariations(false)';
    try {
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
      await cvi.checkWeeklyVariations(false);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const cvi: CviChannel = Container.get(CviChannel);
    const taskName = 'CVI Channel checkDailyVariations(false)';
    try {
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
      await cvi.checkDailyVariations(false);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  schedule.scheduleJob({ start: startTime, rule: tenMinuteRule }, async function() {
    const cvi: CviChannel = Container.get(CviChannel);
    const taskName = 'CVI Channel checkHourlyVariations(false)';
    await cvi.checkHourlyVariations(false);
    try {
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
      await cvi.checkHourlyVariations(false);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
