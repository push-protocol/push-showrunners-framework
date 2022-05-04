/* eslint-disable prettier/prettier */
import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import mStableChannel from './mStableChannel';
const route = Router();
export default (app: Router) => {
  app.use('/showrunners/mStable', route);
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
      Logger.debug('Calling /showrunners/mStable ticker endpoint with body: %o', req.body);
      try {
        const mStable = Container.get(mStableChannel);
        await mStable.snapShotProposalsTask(false);
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
  route.post(
    '/snapshot_ended_proposal',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/mStable ticker endpoint with body: %o', req.body);
      try {
        const mStable = Container.get(mStableChannel);
        await mStable.snapShotEndedProposalsTask(false);
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
  route.post(
    '/snapshot_concluding_proposal',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      Logger.debug('Calling /showrunners/mStable ticker endpoint with body: %o', req.body);
      try {
        const mStable = Container.get(mStableChannel);
        await mStable.snapShotConcludingProposalsTask(false);
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
