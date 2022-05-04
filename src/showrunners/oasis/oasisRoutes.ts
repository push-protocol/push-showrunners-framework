import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import OasisChannel from './oasisChannel';
import middlewares from '../../api/middlewares';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/oasis', route);

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
      logger.debug('Calling /showrunners/oasis/send_message ticker endpoint with body: %o', req.body);
      try {
        const channel = Container.get(OasisChannel);
        const response = await channel.sendMessageToContract(req?.body.simulate);
        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // route.post(
  //   '/test',
  //   celebrate({
  //     body: Joi.object({
  //       simulate: [Joi.bool(), Joi.object()],
  //     }),
  //   }),
  //   middlewares.onlyLocalhost,
  //   async (req: Request, res: Response, next: NextFunction) => {
  //     const logger: Logger = Container.get('logger');
  //     logger.debug('Calling /showrunners/oasis/send_message ticker endpoint with body: %o', req.body);
  //     try {
  //       const oasis = Container.get(OasisChannel);
  //       const response = await oasis.test(req.body.simulate);

  //       return res.status(201).json(response);
  //     } catch (e) {
  //       logger.error('🔥 error: %o', e);
  //       return next(e);
  //     }
  //   },
  // );
};
