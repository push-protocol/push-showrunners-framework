import { Router, Request, Response, NextFunction } from 'express';
import { celebrate, Joi } from 'celebrate';
import { Container } from 'typedi';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/health', route);

  route.get(
    '/healthcheck',
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /health endpoint');

      try {
        // Perform health checks here
        const isHealthy = true;

        if (isHealthy) {
          return res.status(200).json({ status: 'ok' });
        } else {
          return res.status(500).json({ status: 'error' });
        }
      } catch (e) {
        logger.error(':fire: error: %o', e);
        return next(e);
      }
    },
  );
};
