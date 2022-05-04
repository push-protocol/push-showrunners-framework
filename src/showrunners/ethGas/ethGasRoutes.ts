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
      logger.debug('Calling /showrunners/gasprice/send_message endpoint with body: %o', req.body);
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const response = await ethGasChannel.getNewPrice(
          {
            gasHigh: true,
            currentPrice: 150,
            averagePrice: 89,
          },
          req.body.simulate,
        );

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // for updating average gas price
  route.post(
    '/update_gasprice_average',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/update_gasprice_average endpoint with body: %o', req.body);
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const average = await ethGasChannel.updateGasPriceAverage(req.body.simulate);

        return res.status(201).json(average);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // for updating average gas price
  route.post(
    '/get_gas_price',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/get_gas_price endpoint with body: %o', req.body);
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const gasPrice = await ethGasChannel.getGasPrice(req.body.simulate);

        return res.status(201).json(gasPrice);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // for updating average gas price
  route.post(
    '/get_average_gas_price',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/get_average_gas_price endpoint with body: %o', req.body);
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const averageGasPrice = await ethGasChannel.getAverageGasPrice();

        return res.status(201).json(averageGasPrice);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // for updating average gas price
  route.post('/clear_gas_price', middlewares.onlyLocalhost, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling /showrunners/clear_gas_price endpoint with body: %o', req.body);
    try {
      const ethGasChannel = Container.get(EthGasStationChannel);
      await ethGasChannel.clearGasPrices();

      return res.status(204).json(null);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
