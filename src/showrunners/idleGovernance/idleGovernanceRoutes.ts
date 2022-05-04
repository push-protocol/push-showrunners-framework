import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';
import middlewares from '../../api/middlewares';
import { IdleGovernanceChannel } from './idleGovernanceChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/idlegovernance', route);

  // to add an incoming feed
  route.post(
    '/proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: any = Container.get('logger');
      logger.debug('Calling /showrunners/idlegovernance ticker endpoint with body: %o', req.body);
      try {
        const idleGov = Container.get(IdleGovernanceChannel);
        const response = await idleGov.checkForNewGovernanceProposals(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
