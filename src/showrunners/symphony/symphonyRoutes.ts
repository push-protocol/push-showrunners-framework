import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import SymphonyChannel from './symphonyChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/symphony', route);

  route.post(
    '/test',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/symphony ticker endpoint with body: %o', req.body);
      try {
        const channel = Container.get(SymphonyChannel);
        const response = await channel.test(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
