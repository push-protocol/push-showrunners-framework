import { Router, Request, Response, NextFunction, request } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import PodsChannel from './podsChannel';
import { Logger } from 'winston';

const route = Router();

export default(app: Router) => {
    app.use('/showrunners/pods', route);

    route.post(
        '/get_price',
        celebrate({
            body: Joi.object({
                simulate: [Joi.object(), Joi.bool()],
            })
        }),
        middlewares.onlyLocalhost,
        async(req: Request, res: Response, next: NextFunction) => {
            const Logger:any = Container.get('logger');
            Logger.debug("Calling /showrunners/pods/get_price: %o", req.body);
            try{
                const podsChannel = Container.get(PodsChannel);
                const response = await podsChannel.getPrice(null, req.body.simulate)
                return res.status(200).json(response);
            } catch (err) {
                Logger.error('🔥 error: %o', err);
                return next(err);
            }
        }

    )

    route.post(
        '/get_positions',
        celebrate({
            body: Joi.object({
                simulate: [Joi.object(), Joi.bool()],
            })
        }),
        middlewares.onlyLocalhost,
        async(req: Request, res: Response, next: NextFunction) => {
            const logger: Logger = Container.get('logger');
            logger.debug("Calling /showrunners/pods/get_positions: %o", req.body);
            try{
                const podsChannel = Container.get(PodsChannel);
                const response = await podsChannel.getUserPositions(null, req.body.simulate)

                return res.status(200).json(response);
            } catch (err) {
                logger.error('🔥 error: %o', err);
                return next(err);
            }
        }
    );

    route.post(
        '/send_message',
        celebrate({
            body: Joi.object({
                simulate: [Joi.object(), Joi.bool()],
            })
        }),
        middlewares.onlyLocalhost,
        async(req: Request, res: Response, next: NextFunction) => {
            const logger: Logger = Container.get('logger');
            logger.debug("Calling /showrunners/pods/send_message: %o", req.body);
            try{
                const podsChannel = Container.get(PodsChannel);
                const response = await podsChannel.sendMessageToContract(req.body.simulate);

                return res.status(200).json(response);
            }catch(err){
                logger.error('🔥 error: %o', err);
                return next(err);
            }
        }
    )
}