import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import LensChannel from './lensChannel';
import axios from 'axios';
import { Logger } from 'winston';

const route = Router();
import { enableAWSWebhook } from '../../helpers/webhookHelper';

export default (app: Router) => {

};
