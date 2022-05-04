import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';

import middlewares from '../../api/middlewares';
import { Logger } from 'winston';
import OokiChannel from './ookiChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/ooki', route);

  // to add an incoming feed
  route.post(
    '/send_message',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/ooki/send_message ticker endpoint with body: %o', req.body);
      try {
        const ooki = Container.get(OokiChannel);
        const response = await ooki.sendMessageToContract(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // to get token price
  route.post(
    '/get_price',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners-sdk/ooki/get_price ticker endpoint with body: %o', req.body);
      try {
        const ooki = Container.get(OokiChannel);
        const response = await ooki.getPrice(null, req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
