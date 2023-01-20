import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import PhutureChannel from './phutureChannel';
import middlewares from '../../api/middlewares';
import { logger } from 'ethers';
const route = Router();

export default (app: Router) => {
  app.use('/showrunners/phuture', route);

  // weekly status
  route.post(
    '/send_weekly_status',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      logger.debug('Calling /showrunners/makerdux/send_message ticker endpoint with body: %o', req.body);
      try {
        const phuture = Container.get(PhutureChannel);
        const response = await phuture.sendIndexWeeklyStatus(req.body.simulate);
        return res.status(201).json(response);
      } catch (e) {
        logger.info('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @dev for sending rebalance notifications
   */
  route.post(
    '/send_rebalance_notifs',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      logger.debug('Calling /showrunners/makerdux/send_message ticker endpoint with body: %o', req.body);
      try {
        const phuture = Container.get(PhutureChannel);
        const response = await phuture.sendRebalanceNotifs(req.body.simulate);
        return res.status(201).json(response);
      } catch (e) {
        logger.info('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
