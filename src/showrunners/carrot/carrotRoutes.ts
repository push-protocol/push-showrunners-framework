import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import CarrotChannel from './carrotChannel';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/carrot', route);

  route.post(
    '/testing',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    // middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');
      try {
        const carrot = Container.get(CarrotChannel);
        carrot.farmerNotification(false);
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
