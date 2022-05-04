import config from '../../config';
import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';

import CarrotChannel from './carrotChannel';

export default () => {
  const job = schedule.scheduleJob('40 * * * *', async function () {
    try {
      logger.info('The answer to life, the universe, and everything!');
      const carrot = Container.get(CarrotChannel);
      carrot.farmerNotification(false);
    } catch (e) {
      logger.error(`[${new Date(Date.now())}] ❌ Cron Task Failed -- ${e}`);
    }
  });
};
