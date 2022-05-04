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
import SymphonyChannel from './symphonyChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));
  const channel = Container.get(SymphonyChannel);
  channel.logInfo(`🛵 Scheduling Showrunner`);
  const twentyMinuteRule = new schedule.RecurrenceRule();
  twentyMinuteRule.minute = new schedule.Range(0, 59, 20);

  schedule.scheduleJob({ start: startTime, rule: twentyMinuteRule }, async function() {
    const taskName = `${channel.cSettings.name} fetchOrderExecutedLogs(false)`;
    channel.logInfo(taskName);
    try {
      await channel.fetchOrderExecutedLogs(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
