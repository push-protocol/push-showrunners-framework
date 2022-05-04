/* eslint-disable prettier/prettier */
import config from '../../config';
import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';
import RektChannel from './rektChannel';

export default () => {
  const startTime = new Date(new Date().setHours(0, 0, 0, 0));
  const oneHourRule = new schedule.RecurrenceRule();
  oneHourRule.hour = new schedule.Range(0, 23, 1);
  oneHourRule.minute = 0;
  oneHourRule.second = 0;

  logger.info(`     🛵 Scheduling Showrunner - RektChannel [on 1 hour] [${new Date(Date.now())}]`);

  // schedule.scheduleJob({ start: startTime, rule: sixHourRule }, async function() {

  schedule.scheduleJob({ start: startTime, rule: oneHourRule }, async function() {
    const newArticleCheck = Container.get(RektChannel);
    const taskName = 'checking for new article new article and checkForNewArticle';

    try {
      await newArticleCheck.checkForNewArticles(false);
      logger.info(`[${new Date(Date.now())}] 🐣 Cron Task Completed -- ${taskName}`);
    } catch (err) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${taskName}`);
      logger.error(`[${new Date(Date.now())}] Error Object: %o`, err);
    }
  });
};
