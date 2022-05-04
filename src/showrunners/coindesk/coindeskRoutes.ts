import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import CoindeskChannel from './coindeskChannel';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/coindesk', route);

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
        snapshot.checkForNewArticles(req.body.simulate);
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
        const coindeskChannel = Container.get(CoindeskChannel);
        const ret = coindeskChannel.checkForNewArticles(req.body.simulate);
        return res.json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e)
      }
    },
  );
};
