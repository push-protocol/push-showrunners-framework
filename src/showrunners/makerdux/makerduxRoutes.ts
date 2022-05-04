import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';

import { celebrate, Joi } from 'celebrate';

import MakerChannel from "./makerduxChannel"
import middlewares from '../../api/middlewares';
import { handleResponse } from '../../helpers/utilsHelper';
import {  logger } from 'ethers';
const route = Router();

export default (app: Router) => {
    app.use('/showrunners/makerdux', route);

    // to add an incoming feed
    route.post(
        '/send_message',
        celebrate({
            body: Joi.object({
              simulate: [Joi.bool(), Joi.object()],
            }),
        }),
        middlewares.onlyLocalhost,
        async (req: Request, res: Response, next: NextFunction) => {
            const Logger = Container.get('logger');
            logger.debug('Calling /showrunners/makerdux/send_message ticker endpoint with body: %o', req.body )
            try{
                const maker = Container.get(MakerChannel);
                const response = await maker.sendMessageToContract(req.body.simulate);
                return res.status(201).json(response);
            } catch (e) {
                logger.info('🔥 error: %o', e);
                return next(e);
            }
        }
    )

    route.post(
        '/start_vote',
        celebrate({
            body: Joi.object({
              simulate: [Joi.bool(), Joi.object()],
            }),
        }),
        middlewares.onlyLocalhost,
        async (req: Request, res: Response, next: NextFunction) => {
            const Logger = Container.get('logger');
            logger.debug('Calling /showrunners/makerdux/send_message ticker endpoint with body: %o', req.body )
            try{
                const maker = Container.get(MakerChannel);
                const response = await maker.checkStartDateAndNotify(req.body.simulate);
                return res.status(201).json(response);
            } catch (e) {
                logger.info('🔥 error: %o', e);
                return next(e);
            }
        }
    )

    route.post(
        '/end_vote',
        celebrate({
            body: Joi.object({
              simulate: [Joi.bool(), Joi.object()],
            }),
        }),
        middlewares.onlyLocalhost,
        async (req: Request, res: Response, next: NextFunction) => {
            const Logger = Container.get('logger');
            logger.debug('Calling /showrunners/makerdux/send_message ticker endpoint with body: %o', req.body )
            try{
                const maker = Container.get(MakerChannel);
                const response = await maker.checkEndDateAndNotify(req.body.simulate);
                return res.status(201).json(response);
            } catch (e) {
                logger.info('🔥 error: %o', e);
                return next(e);
            }
        }
    )
}