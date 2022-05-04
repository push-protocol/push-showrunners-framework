import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import CoindeskChannel from './rektChannel';
import { Logger } from 'winston';
import RektChannel from './rektChannel';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/rekt', route);

  route.post(
    '/testit',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');

      try {
        const snapshot = Container.get(CoindeskChannel);
        snapshot.checkForNewArticles(false);
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
  route.post(
    '/sendNotification',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/sendNotification', req.body);

      try {
        const rektChannel = Container.get(RektChannel);
        const ret = rektChannel.checkForNewArticles(false);
        return res.json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e)
      }
    },
  );
};
