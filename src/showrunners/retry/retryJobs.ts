/* eslint-disable prettier/prettier */
import config from '../../config';
import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';
import RetryChannel from './retryChannel';
import { stubFalse } from 'lodash';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));
  const oneHourRule = new schedule.RecurrenceRule();
  oneHourRule.hour = new schedule.Range(0, 23, 1);
  oneHourRule.minute = 0;
  oneHourRule.second = 0;

  logger.info(`     🛵 Scheduling Showrunner - retryChannel [on 1 hour] [${new Date(Date.now())}]`);

  // schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {4

  const channel = Container.get(RetryChannel);

  schedule.scheduleJob({ start: startTime, rule: oneHourRule }, async function () {
    const taskName = 'Retry Logic';

    try {
      await channel.sendMessageToContract(stubFalse);
      logger.info(`[${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
