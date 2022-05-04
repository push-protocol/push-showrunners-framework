import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import UniswapV3Channel from './uniswapv3Channel';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/uniswapv3', route);

  route.post(
    '/send_message',
    celebrate({
      body: Joi.object({
        simulate: [Joi.object(), Joi.bool()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/uniswapv3/send_messages: %o', req.body);
      try {
        const uniswapv3 = Container.get(UniswapV3Channel);
        const response = await uniswapv3.sendMessageToContracts(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_position_details',
    celebrate({
      body: Joi.object({
        simulate: Joi.object(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/uniswapv3/get_pool_price ticker endpoint with body: %o', req.body);

      try {
        const uniswapv3 = Container.get(UniswapV3Channel);
        const response = await uniswapv3.getPositionDetails(null, null, null, null, null, null, false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_positions',
    celebrate({
      body: Joi.object({
        simulate: Joi.object(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/uniswapv3/send_message ticker endpoint with body: %o', req.body);
      try {
        const uniswapv3 = Container.get(UniswapV3Channel);
        const response = await uniswapv3.getPositions(null, false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
