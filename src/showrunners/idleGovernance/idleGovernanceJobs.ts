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
import { IdleGovernanceChannel } from './idleGovernanceChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));

  const sixHourRule = new schedule.RecurrenceRule();
  sixHourRule.hour = new schedule.Range(0, 23, 6);
  sixHourRule.minute = 0;
  sixHourRule.second = 0;
  const channel = Container.get(IdleGovernanceChannel);
  channel.logInfo(` 🛵 Scheduling Showrunner - Idle Governance Channel`);

  schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {
    const taskName = `${channel.cSettings.name} event checks and checkForNewGovernanceProposals`;

    try {
      await channel.checkForNewGovernanceProposals(false);

      channel.logInfo(`🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      channel.logInfo(`❌ Cron Task Failed -- ${taskName}`);
      channel.logError(`Error Object: %o`);
      channel.logError(err);
    }
  });
};
