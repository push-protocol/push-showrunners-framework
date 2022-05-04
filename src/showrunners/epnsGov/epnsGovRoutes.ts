import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import epnsGovChannel from './epnsGovChannel';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/epnsGov', route);

  route.post(
    '/check_forum_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.checkForumProposals(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_forum_discussions',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.checkForumDiscussions(req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_active_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.checkActiveProposals(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_ending_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.checkEndingProposals(false);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/fetch_space_details',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.fetchSpaceDetails();

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/query_active_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.queryActiveProposals(null, null, req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/query_ending_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.queryEndingProposals(null, req.body.simulate);

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/fetch_gov_proposals',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.fetchGovProposals();

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/fetch_gov_discussions',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /showrunners/epnsGov ticker endpoint with body: %o', req.body);
      try {
        const epnsGov = Container.get(epnsGovChannel);
        const response = await epnsGov.fetchGovDiscussions();

        return res.status(201).json(response);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
