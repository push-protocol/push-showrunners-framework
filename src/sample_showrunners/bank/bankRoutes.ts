import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../../api/middlewares';
import { celebrate, Joi } from 'celebrate';
import TestChannel from './bankChannel';

import { PushAPI } from "@pushprotocol/restapi";

import { ethers } from "ethers";

const route = Router();

export default async (app: Router) => {
  app.use('/showrunners/bank', route);
  const provider = new ethers.providers.WebSocketProvider('wss://polygon-mumbai.g.alchemy.com/v2/jPp5II90BUILENlH5dGYkQMMKndhuOGd');
  const signer = new ethers.Wallet(
    '5f88b404b7d967b68b77939f7c376b3dd9aa385100e462baa2ad205965c3517c', // Arv test
      provider
  );

  // Initialize wallet user, pass 'prod' instead of 'staging' for mainnet apps
  const userAlice = await PushAPI.initialize(signer, { env: "staging" });

  route.post(
    '/investment',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');

      try {
        const bank = Container.get(TestChannel);
        bank.investmentNotif(userAlice, 10, req.body.simulate); // change number here
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/holiday',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger: any = Container.get('logger');

      try {
        const bank = Container.get(TestChannel);
        bank.holidayNotif(userAlice, true, req.body.simulate); // change true and false here
        return res.status(201).json({ success: true });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};