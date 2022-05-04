import { Logger } from 'winston';
import { Container } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Router, Request, Response, NextFunction } from 'express';

import RetryChannel from './retryChannel';
import middlewares from '../../api/middlewares';

const route = Router();

export default (app: Router) => {
  const channel = Container.get(RetryChannel);

  app.use('/showrunners/retry', route);

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
      logger.debug('Calling /showrunners/snapshot ticker endpoint with body: %o', req.body);

      try {
        const response = await channel.sendMessageToContract(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
