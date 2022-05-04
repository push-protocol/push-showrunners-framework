import { Router, Request, Response, NextFunction } from 'express';
import Container from 'typedi';
import GroChannel from './groChannel';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/gro', route);

  route.post(
    '/claim-vesting',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/gro ticker endpoint with body: %o', req.body);
      try {
        const gro = Container.get(GroChannel);
        const response = await gro.getClaimVestingEvents(req.body.simulate);
        res.status(201).send(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/airdrop_soon',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/gro ticker endpoint with body: %o', req.body);
      try {
        const gro = Container.get(GroChannel);
        const response = await gro.getAirdropSoon(req.body.simulate);
        res.status(201).send(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
  route.post(
    '/claimable_airdrop',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/gro ticker endpoint with body: %o', req.body);
      try {
        const gro = Container.get(GroChannel);
        const response = await gro.getClaimableAirdropNotif(req.body.simulate);
        res.status(201).send(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
