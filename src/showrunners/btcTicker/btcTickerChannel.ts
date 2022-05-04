import { Service, Inject } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

const bent = require('bent'); // Download library

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
const btcTickerSettings = require('./btcTickerSettings.json');
@Service()
export default class BtcTickerChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'BTC Ticker',
      url: 'https://epns.io/',
      useOffChain: true,
      address: '0x03EAAAa48ea78d1E66eA3458364d553AD981871E',
    });
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;

    this.getNewPrice(logger)
      .then(async (payload: any) => {
        this.sendNotification({
          recipient: this.channelAddress,
          title: payload.notifTitle,
          message: payload.notifMsg,
          payloadTitle: payload.title,
          payloadMsg: payload.msg,
          notificationType: payload.type,
          image: null,
          simulate: simulate,
        });
      })
      .catch(err => {
        logger.error(`[${new Date(Date.now())}]-[BTC Ticker]- Errored on CMC API... skipped with error: %o`, err);
      });
  }

  public async getNewPrice(logger) {
    logger.debug(`[${new Date(Date.now())}]-[BTC Ticker]-Getting price of btc... `);

    return await new Promise((resolve, reject) => {
      const getJSON = bent('json');

      const cmcroute = 'v1/cryptocurrency/quotes/latest';
      const pollURL = `${btcTickerSettings.cmcEndpoint}${cmcroute}?symbol=BTC&CMC_PRO_API_KEY=${btcTickerSettings.cmcAPIKey}`;

      getJSON(pollURL)
        .then(async response => {
          if (response.status.error_code) {
            reject(`[${new Date(Date.now())}]-[BTC Ticker]-CMC Error: ${response.status}`);
          }

          logger.info(`[${new Date(Date.now())}]-[BTC Ticker]-CMC Response: %o`, response);

          // Get data
          const data = response.data['BTC'];

          // construct Title and Message from data
          const price = data.quote.USD.price;
          const formattedPrice = Number(Number(price).toFixed(2)).toLocaleString();

          const hourChange = Number(data.quote.USD.percent_change_1h);
          const dayChange = Number(data.quote.USD.percent_change_24h);
          const weekChange = Number(data.quote.USD.percent_change_7d);
          const hourChangeFixed = hourChange.toFixed(2);
          const dayChangeFixed = dayChange.toFixed(2);
          const weekChangeFixed = weekChange.toFixed(2);

          const title = 'BTC at $' + formattedPrice;
          const message = `\nHourly Movement: ${hourChangeFixed}%\nDaily Movement: ${dayChangeFixed}%\nWeekly Movement: ${weekChangeFixed}%`;

          const payloadTitle = `BTC Price Movement`;
          const payloadMsg = `BTC at [d:$${formattedPrice}]\n\nHourly Movement: ${
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
