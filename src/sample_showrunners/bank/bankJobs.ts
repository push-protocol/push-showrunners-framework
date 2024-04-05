import logger from '../../loaders/logger';

import { Container } from 'typedi';
import schedule from 'node-schedule';
import bankChannel from './bankChannel';

export default () => {
  const channel = Container.get(bankChannel);
  channel.startEventListener(false);
};