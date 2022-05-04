import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { handleResponse } from '../../helpers/utilsHelper';
import { Logger } from 'winston';
import FabweltChannel from './fabweltChannel';

const router = Router();
const route = '/showrunners/fabwelt';
export default (app: Router) => {
  app.use(route, router);

  /**
   * Send Message
   * @description Send a notification via the ensdomain showrunner
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
  router.post(
    '/test',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const channel = Container.get(FabweltChannel);
        // channel.tournamentAlertTask(req?.body?.simulate);
        channel.fetchTournaments();
        res.json({ success: true });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );
};
