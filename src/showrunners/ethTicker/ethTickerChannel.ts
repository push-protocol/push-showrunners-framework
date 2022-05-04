// @name: ETH Tracker Channel
// @version: 1.0
// @recent_changes: ETH Price Tracker

import { Service, Inject } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';

import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

const bent = require('bent'); // Download library

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
// const ethTickerSettings = require('./ethTickerSettings.json')

@Service()
export default class EthTickerChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'ETH Ticker',
      url: 'https://epns.io/',
      useOffChain: true,
      address: '0xDBc5936E4daaE94F415C39D284f6a69c4d553F2F',
    });
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;

    this.getNewPrice()
      .then(async (payload: any) => {
        this.sendNotification({
          recipient: this.channelAddress,
          title: payload.notifTitle,
          message: payload.notifMsg,
          payloadTitle: payload.title,
          payloadMsg: payload.msg,
          notificationType: payload.type,
          simulate: simulate,
          image: null,
        });
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
      const pollURL = `${config.cmcEndpoint}${cmcroute}?symbol=ETH&CMC_PRO_API_KEY=${config.cmcAPIKey}`;

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
          };

          resolve(payload);
        })
        .catch(err => reject(`Unable to reach CMC API, error: ${err}`));
    });
  }
}
