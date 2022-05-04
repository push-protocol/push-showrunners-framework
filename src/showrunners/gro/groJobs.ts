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
import GroChannel from './groChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const twentyThreeHourRule = new schedule.RecurrenceRule();
  twentyThreeHourRule.hour = new schedule.Range(0, 23, 23);
  twentyThreeHourRule.minute = 0;
  twentyThreeHourRule.second = 0;

  const channel = Container.get(GroChannel);

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 23hr ]`);
  schedule.scheduleJob({ start: startTime, rule: twentyThreeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} ClaimVestingEvents(false)`;
    try {
      await channel.getClaimVestingEvents(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 23hr ]`);
  schedule.scheduleJob({ start: startTime, rule: twentyThreeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} getClaimableAirdropNotif(false)`;
    try {
      await channel.getClaimableAirdropNotif(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 23hr ]`);
  schedule.scheduleJob({ start: startTime, rule: twentyThreeHourRule }, async function() {
    const taskName = `${channel.cSettings.name} getAirdropSoon(false)`;
    try {
      await channel.getAirdropSoon(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
