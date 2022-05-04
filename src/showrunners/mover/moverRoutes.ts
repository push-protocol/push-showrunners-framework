import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';
import middlewares from '../../api/middlewares';
import { MoverChannel } from './moverChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/mover', route);

  // to add an incoming feed
  route.post(
    '/test',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: any = Container.get('logger');
      logger.debug('Calling /showrunners/mover ticker endpoint with body: %o', req.body);
      try {
        const idleGov = Container.get(MoverChannel);
        const response = await idleGov.checkForYieldDistributed(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
