import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';

import AngleChannel from './angleChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));
  const dailyRule = new schedule.RecurrenceRule();
  dailyRule.hour = 0;
  dailyRule.minute = 0;
  dailyRule.second = 0;
  dailyRule.dayOfWeek = new schedule.Range(0, 6);

  const channel = Container.get(AngleChannel);

  channel.logInfo(`     🛵 Scheduling Showrunner  [on 24 hours] `);

  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const taskName = `${channel.cSettings.name} liquidationTask`;

    try {
      await channel.liquidationTask(false);
      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });

  channel.logInfo(`     🛵 Scheduling Showrunner  [on 24 hours] `);
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const taskName = `${channel.cSettings.name} forceCloseTask(false)`;

    try {
      await channel.forceCloseTask(false);
      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });

  channel.logInfo(`     🛵 Scheduling Showrunner  [on 24 hours] `);
  schedule.scheduleJob({ start: startTime, rule: dailyRule }, async function() {
    const taskName = `${channel.cSettings.name} yieldTask(false)`;

    try {
      await channel.yieldTask(false);
      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
