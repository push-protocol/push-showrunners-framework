import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';
import middlewares from '../../api/middlewares';
import { KyberSwapChannel } from './kyberSwapChannel';


const route = Router();

export default (app: Router) => {
  app.use('/showrunners/kyberswap', route);

  // to add an incoming feed
  route.post(
    '/binaryproposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: any = Container.get('logger');
      logger.debug('Calling /showrunners/kyberswap ticker endpoint with body: %o', req.body);
      try {
        const kyberSwap = Container.get(KyberSwapChannel);
        const response = await kyberSwap.checkForNewBinaryProposals(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );




  // to add an incoming feed
  route.post(
    '/newproposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: any = Container.get('logger');
      logger.debug('Calling /showrunners/kyberswap ticker endpoint with body: %o', req.body);
      try {
     
        const kyberSwap = Container.get(KyberSwapChannel);
        
        const response = await kyberSwap.checkForNewProposals(false);
       
        return res.status(201).json(response);
      } catch (e) {
        console.log("=====================")
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
