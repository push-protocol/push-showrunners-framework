import { Logger } from 'winston';
import { Container } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response, NextFunction } from 'express';

import monitoringChannel from './monitoringChannel';
import middlewares from '../../api/middlewares';

const route = Router();

export default (app: Router) => {
  const channel = Container.get(monitoringChannel);

  app.use('/showrunners/monitoring', route);

  route.post(
    '/getallnotifications',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    // middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/monitoring ticker endpoint with body: %o', req.body);

      try {
        const response = await channel.getAllNotification(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getchannelnotification',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    // middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/monitoring ticker endpoint with body: %o', req.body);

      try {
        const response = await channel.getChannelNotification(req.body.simulate.channelName);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getnotificationbydate',
    celebrate({
      body: Joi.object({
        query: Joi.object(),
      }),
    }),
    // middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/monitoring ticker endpoint with body: %o', req.body);

      try {
        const response = await channel.getNotificationByDate(req.body.query);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
