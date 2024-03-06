import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import priceTrackerChannel from './priceTrackerChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/priceTracker', route);

  route.post(
    '/booleanNotification',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/wt ticker endpoint with body: %o', req.body);
      try {
        const priceTracker = Container.get(priceTrackerChannel);
        const response = await priceTracker.triggerUserNotification(req.body.simulate);

        return res.status(201).json({ success: true, data: response });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


};
