// @name: ETH Tracker Channel
// @version: 1.0
// @recent_changes: ETH Price Tracker

import { Service, Inject } from 'typedi';
import config from '../../config';

import axios from 'axios';

import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

// Import the Push SDK
import { PushAPI } from "@pushprotocol/restapi";
 
import { ethers } from "ethers";
import { mongo } from 'mongoose';

import { ethTickerModel } from './ethTickerModel';


const bent = require('bent'); // Download library

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
// const ethTickerSettings = require('./ethTickerSettings.json')

@Service()
export default class EthTickerChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'ETH Ticker',
      url: 'https://epns.io/',
      useOffChain: true,
    });
  }

  /*
    1. Fetch all the user settings - userAlice.channel.subscribers()
    2. 
  */

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;

    this.getNewPrice()
      .then(async (payload: any) => {

        for (let i = 0; i < payload.recipients.length; i++) {
          this.sendNotification({
            // recipient: this.channelAddress,
            recipient: payload.recipients[i], // new 
            title: payload.notifTitle,
            message: payload.notifMsg,
            payloadTitle: payload.title,
            payloadMsg: payload.msg,
            notificationType: payload.type,
            simulate: simulate,
            image: null,
          });
        }
      })
      .catch(err => {
        logger.error(`[${new Date(Date.now())}]-[ETH Ticker]- Errored on CMC API... skipped with error: %o`, err);
      });
  }

  public async getNewPrice() {
    const logger = this.logger;
    logger.debug(`[${new Date(Date.now())}]-[ETH Ticker]-Getting price of eth... `);

    return await new Promise((resolve, reject) => {
      const getJSON = bent('json');

      const cmcroute = 'v1/cryptocurrency/quotes/latest';
      const cmcEndpoint = 'https://pro-api.coinmarketcap.com/'
      const pollURL = `${cmcEndpoint}${cmcroute}?symbol=ETH&CMC_PRO_API_KEY=${'1bbe0bab-4ee7-4a38-8b03-b49a0b4fff4e' || config.cmcAPIKey}`;

      console.log(`CMC Cnnfig: ${cmcEndpoint}, CMC_PRO_API_KEY = ${'1bbe0bab-4ee7-4a38-8b03-b49a0b4fff4e' || config.cmcAPIKey}`);

      getJSON(pollURL)
        .then(async (response: any) => {
          if (response.status.error_code) {
            reject(`CMC Error: ${response.status}`);
          }

          logger.info(`[${new Date(Date.now())}]-[ETH Ticker]-CMC Response: %o`, response);

          // Get data
          const data = response.data['ETH'];

          // construct Title and Message from data
          const price = data.quote.USD.price;
          const formattedPrice = Number(Number(price).toFixed(2)).toLocaleString();

          
          const hourChange = Number(data.quote.USD.percent_change_1h);
          const dayChange = Number(data.quote.USD.percent_change_24h);
          const weekChange = Number(data.quote.USD.percent_change_7d);

          const hourChangeFixed = hourChange.toFixed(2);
          const dayChangeFixed = dayChange.toFixed(2);
          const weekChangeFixed = weekChange.toFixed(2);

          // Initialize arr for all recepients
          let recipients: string[] = [];

          // 1. Store prev price in MongoDB
          // Store
          await ethTickerModel.findByIdAndUpdate(
            { _id: 'prev_eth_price' },
            { prevEthPrice: Number(formattedPrice) },
            { upsert: true },
          );

          // Retrieve
          // const prevPrice = 0; //= mongo.findOne();
          const prevPrice = await ethTickerModel.findOne({ _id: 'prev_eth_price' });
          
          // 2. Calculate percentage change. |prevValue - currentValue| / prevValue
          const changePercentage = Math.abs(prevPrice.prevEthPrice - price) / prevPrice.prevEthPrice;

          // 3. Get the list of all the addresses opted in for the setting - /subscribers?category=2&setting=true
          const { data: userData } = await axios(`https://backend-staging.epns.io/apis/v1/channels/eip155:${'11155111'}:${'0x9C2dA92ff312b630B67cEa1d2C234250c2d3410e'}/subscribers?category=${'2'}&setting=${'true'}`);

          // 4. Loop through the `settings` array for the required type (say 2 here) and get the `user` value
          userData.subscribers.map((subscriberObj) => {
            const userSettings = JSON.parse(subscriberObj.settings);
            const temp = userSettings.find((obj) => obj.index === 1); // arr[0] = index: 1 ---> arrIndex + 1
            let userValue : number;

            if (temp.enabled === true) {
              userValue = temp.user;

              // Construct payload if optted in or pass
              // 5. If the value matches the percentage change, send the notification, else pass
              if (userValue === hourChange) {
                recipients.push(subscriberObj.subscriber);
              }
            }
          });

          const title = 'ETH at $' + formattedPrice;
          const message = `\nHourly Movement: ${hourChangeFixed}%\nDaily Movement: ${dayChangeFixed}%\nWeekly Movement: ${weekChangeFixed}%`;
                  
          const payloadTitle = `ETH Price Movement`;
          const payloadMsg = `ETH at [d:$${formattedPrice}]\n\nHourly Movement: ${
            hourChange >= 0 ? '[s:' + hourChangeFixed + '%]' : '[t:' + hourChangeFixed + '%]'
          }\nDaily Movement: ${
            dayChange >= 0 ? '[s:' + dayChangeFixed + '%]' : '[t:' + dayChangeFixed + '%]'
          }\nWeekly Movement: ${
            weekChange >= 0 ? '[s:' + weekChangeFixed + '%]' : '[t:' + weekChangeFixed + '%]'
          }[timestamp: ${Math.floor(Date.now() / 1000)}]`;
              
          const payload = {
            type: 1, // Type of Notification
            notifTitle: title, // Title of Notification
            notifMsg: message, // Message of Notification
            title: payloadTitle, // Internal Title
            msg: payloadMsg, // Internal Message
            recipients: recipients // Recipients Array
          };

          resolve(payload);
        })
        .catch(err => reject(`Unable to reach CMC API, error: ${err}`));
    });
  }
}
