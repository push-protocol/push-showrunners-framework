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
import FabweltChannel from './fabweltChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const tenMinuteRule = new schedule.RecurrenceRule();
  tenMinuteRule.minute = new schedule.Range(0, 59, 10);
  const channel = Container.get(FabweltChannel);

  channel.logInfo(`     🛵 Scheduling Showrunner -[on 10 minutes]`);
  schedule.scheduleJob({ start: startTime, rule: tenMinuteRule }, async function() {
    const taskName = `${channel.cSettings.name} tournamentAlertTask(false)`;

    try {
      await channel.tournamentAlertTask(false);
      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
