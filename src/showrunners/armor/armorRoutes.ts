import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';
import middlewares from '../../api/middlewares';
import { ArmorChannel } from './armorChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/armor', route);

  // to add an incoming feed
  route.post(
    '/arnft_expiration',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,  
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: any = Container.get('logger');
      logger.debug('Calling /showrunners/armor ticker endpoint with body: %o', req.body);
      try {
        const armor = Container.get(ArmorChannel);
        const response = await armor.checkForExpiringARNFTs(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
