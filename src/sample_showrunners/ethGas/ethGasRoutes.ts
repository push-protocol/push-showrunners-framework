import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import EthGasStationChannel from './ethGasChannel';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/gasprice', route);

  // for checking and sending gas price alerts
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
      logger.debug('Calling /showrunners/gasprice/send_message endpoint with body: %o', req.body);
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const response = await ethGasChannel.sendMessageToContract(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
