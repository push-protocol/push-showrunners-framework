import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { BancorChannel } from './bancorChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/bancor', route);

  route.post(
    '/snapshot_proposal',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/bancor ticker endpoint with body: %o', req.body);
      try {
        const bancor = Container.get(BancorChannel);
        await bancor.snapShotProposalsTask(false);

        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
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
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/bancor ticker endpoint with body: %o', req.body);
      try {
        const bancor = Container.get(BancorChannel);
        await bancor.poolProgramAddedTask(req.body.simulate);

        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/new_listings',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/bancor ticker endpoint with body: %o', req.body);
      try {
        const bancor = Container.get(BancorChannel);
        await bancor.newTokenListingsTask(false);

        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/testing',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/bancor ticker endpoint with body: %o', req.body);
      try {
        const bancor = Container.get(BancorChannel);
        await bancor.tokenUpdateTask(req.body.simulate);

        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
