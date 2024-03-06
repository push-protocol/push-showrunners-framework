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
import PriceTrackerChannel from './priceTrackerChannel';

export default () => {
  // wallet tracker jobs
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const threeHourRule = new schedule.RecurrenceRule();
  threeHourRule.hour = new schedule.Range(0, 23, 3);
  threeHourRule.minute = 0;
  threeHourRule.second = 0;

  const channel = Container.get(PriceTrackerChannel);  
  channel.logInfo(`-- 🛵 Scheduling Showrunner ${channel.cSettings.name} -  Channel [on 3hr ]`);

  schedule.scheduleJob({ start: startTime, rule: threeHourRule }, async function () {
    const taskName = `${channel.cSettings.name} priceTracker.loadEvents(null) and triggerUserNotification()`;
    try {
      await channel.triggerUserNotification(true);
      logger.info(`${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
