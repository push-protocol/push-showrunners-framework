import { Service, Inject } from 'typedi';
import config from '../../config';
import settings from './btcTickerSettings.json';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import keys from './btcTickerKeys.json';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { ethers } from 'ethers';
import { btcTickerUserModel, btcTickerGlobalModel } from './btcTickerModel';
import axios from 'axios';

const NETWORK_TO_MONITOR = config.web3TestnetSepoliaNetwork;

@Service()
export default class BtcTickerChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'Btc Ticker',
      url: 'https://push.org/',
      useOffChain: true,
    });
  }
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    try {
      this.logInfo(`🔔🔔Sending notifications`);

      // Get New price function call
      await this.getNewPrice(simulate);
    } catch (error) {
      logger.error(`[${new Date(Date.now())}]-[Btc Tracker]- Errored on CMC API... skipped with error: %o`, error);
    }
  }

  public async getNewPrice(simulate) {
    const logger = this.logger;
    logger.debug(`[${new Date(Date.now())}]-[Btc Ticker]-Getting price of Btc... `);

    try {
      const cmcroute = settings.route;
      const cmcEndpoint = settings.cmcEndpoint;
      const pollURL = `${cmcEndpoint}${cmcroute}?symbol=BTC&CMC_PRO_API_KEY=${config.cmcAPIKey || settings.cmcKey}`;

      // Fetching data from the CMC API
      let { data } = await axios.get(pollURL);
      data = data.data;

      // this.logInfo(`✅ DATA: ${JSON.stringify(data.BTC.quote.USD)}`);

      // construct Title and Message from data
      const price = data.BTC.quote.USD.price;
      const formattedPrice = Number(Number(price).toFixed(2));
      // this.logInfo(`Formatted PRice ${formattedPrice}`);

      const hourChange = Number(data.BTC.quote.USD.percent_change_1h);
      const dayChange = Number(data.BTC.quote.USD.percent_change_24h);
      const weekChange = Number(data.BTC.quote.USD.percent_change_7d);

      const hourChangeFixed = hourChange.toFixed(2);
      const dayChangeFixed = dayChange.toFixed(2);
      const weekChangeFixed = weekChange.toFixed(2);

      // Retrive Global data
      const btcTrackerGlobalData =
        (await btcTickerGlobalModel.findOne({ _id: 'btcTrackerGlobal' })) ||
        (await btcTickerGlobalModel.create({
          _id: 'btcTrackerGlobal',
          prevBtcPrice: Number(formattedPrice),
          cycles: 0,
        }));

      // Assign cycles and prevBtcPrice
      const CYCLES = btcTrackerGlobalData.cycles ? btcTrackerGlobalData.cycles : 0;
      const prevPrice = btcTrackerGlobalData.prevBtcPrice ? btcTrackerGlobalData.prevBtcPrice : 0;

      // Update current price as prev price
      await btcTickerGlobalModel.findByIdAndUpdate(
        { _id: 'btcTrackerGlobal' },
        { prevBtcPrice: Number(formattedPrice) },
        { upsert: true },
      );

      //  this.logInfo(`Prev Price: ${prevPrice}`);
      //   this.logInfo(`Current Price: ${formattedPrice}`);

      // 2. Calculate percentage change. |New Price - Old Price| / Old Price
      // Set the Formatted price to a higher price then current Btc price to testout notification
      // const changePercentage = ((Math.abs(formattedPrice - prevPrice) / prevPrice) * 100).toFixed(2);

      const globalChangePercentage = Math.round((Math.abs(formattedPrice - prevPrice) / prevPrice) * 100);

      // this.logInfo('Change Price :' + globalChangePercentage);

      // Build Payload Content
      let changeInper = Number(((Math.abs(formattedPrice - prevPrice) / prevPrice) * 100).toFixed(2));

      const title = 'BTC at $' + formattedPrice;
      const message = `\nHourly Movement: ${hourChangeFixed}%\nDaily Movement: ${dayChangeFixed}%\nWeekly Movement: ${weekChangeFixed}%`;
      const payloadTitle = `BTC Price Movement`;
      const globalPayloadMsg = `BTC at [t:$${formattedPrice} (${
        changeInper >= 0 ? (changeInper < 100 ? `+` + changeInper + '%' : '+' + 0 + '%') : `-` + changeInper + '%'
      })]\n\nHourly Movement: ${
        hourChange >= 0 ? '[s: +' + hourChangeFixed + '%]' : '[d: -' + hourChangeFixed + '%]'
      }\nDaily Movement: ${
        dayChange >= 0 ? '[s: +' + dayChangeFixed + '%]' : '[d: -' + dayChangeFixed + '%]'
      }\nWeekly Movement: ${
        weekChange >= 0 ? '[s: +' + weekChangeFixed + '%]' : '[d: -' + weekChangeFixed + '%]'
      }[timestamp: ${Math.floor(Date.now() / 1000)}]`;

      // --------------------------------------------------------------------------------------------- */

      // Initializing userAlice
      const provider = new ethers.providers.JsonRpcProvider(config.web3TestnetSepoliaProvider || settings.providerUrl);

      const signer = new ethers.Wallet(keys.PRIVATE_KEY_NEW_STANDARD.PK, provider);
      const userAlice = await PushAPI.initialize(signer, { env: CONSTANTS.ENV.STAGING });

      let i = 1;

      while (true) {
        const userData: any = await userAlice.channel.subscribers({
          page: i,
          limit: 10,
          setting: true,
        });

        if (userData.itemcount != 0) {
          i++;
        } else {
          console.log('Breakkkk.');
          i = 1;

          // UPDATE CYCLES VALUE
          // HERE
          await btcTickerGlobalModel.findOneAndUpdate(
            { _id: 'btcTrackerGlobal' },
            { $inc: { cycles: 3 } },
            { upsert: true },
          );
          const btcTickerGlobalData = await btcTickerGlobalModel.findOne({ _id: 'btcTrackerGlobal' });

          //    this.logInfo(`🎯Cycles value after all computation: ${btcTickerGlobalData?.cycles}`);

          break;
        }

        // 4. Loop through the `settings` array for the required type (say 2 here) and get the `user` value
        await Promise.all(
          userData.subscribers.map(async (subscriberObj) => {
            const userSettings = JSON.parse(subscriberObj.settings);

            // this.logInfo(`⚡⚡⚡Setting ${JSON.stringify(userSettings)} (${subscriberObj.subscriber})`);

            // Fetch users last btc price & last cycle values
            const userDBValue =
              (await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber })) ||
              (await btcTickerUserModel.create({
                _id: subscriberObj.subscriber,
                lastCycle: btcTrackerGlobalData.cycles,
                lastbtcPrice: btcTrackerGlobalData.prevBtcPrice,
              }));

            // ----------------------------------------------------
            // Calculation of percentage change for each subscriber
            const changePercentage = (
              (Math.abs(formattedPrice - Number(userDBValue.lastBtcPrice) || prevPrice) /
                Number(userDBValue.lastBtcPrice) || prevPrice) * 100
            ).toFixed(2);

            this.logInfo(`🔽Previous BTC price of ${subscriberObj.subscriber}: ` + Number(userDBValue.lastBtcPrice));
            //   this.logInfo(`Change Price ${subscriberObj.subscriber} :` + changePercentage);

            // ----------------------------------------------------

            // Build payload message for each subscriber
            let payloadMsg;

            if (Number(changePercentage) == 0) {
              payloadMsg = `BTC at [t:$${formattedPrice} ( 0 %
              )]\n\nHourly Movement: ${
                hourChange >= 0 ? '[s: +' + hourChangeFixed + '%]' : '[d: ' + hourChangeFixed + '%]'
              }\nDaily Movement: ${
                dayChange >= 0 ? '[s: +' + dayChangeFixed + '%]' : '[d: ' + dayChangeFixed + '%]'
              }\nWeekly Movement: ${
                weekChange >= 0 ? '[s: +' + weekChangeFixed + '%]' : '[d: ' + weekChangeFixed + '%]'
              }[timestamp: ${Math.floor(Date.now() / 1000)}]`;
            } else {
              let changeInpercentage = Number(
                (
                  ((formattedPrice - Number(userDBValue.lastBtcPrice) || prevPrice) /
                    Number(userDBValue.lastBtcPrice) || prevPrice) * 100
                ).toFixed(2),
              );
              payloadMsg = `BTC at [t:$${formattedPrice} (${
                changeInpercentage > 0
                  ? changeInpercentage < 100
                    ? `+` + changeInpercentage + '%'
                    : '+' + 0 + '%'
                  : `-` + changeInpercentage + '%'
              })]\n\nHourly Movement: ${
                hourChange >= 0 ? '[s: +' + hourChangeFixed + '%]' : '[d: ' + hourChangeFixed + '%]'
              }\nDaily Movement: ${
                dayChange >= 0 ? '[s: +' + dayChangeFixed + '%]' : '[d: ' + dayChangeFixed + '%]'
              }\nWeekly Movement: ${
                weekChange >= 0 ? '[s: +' + weekChangeFixed + '%]' : '[d: ' + weekChangeFixed + '%]'
              }[timestamp: ${Math.floor(Date.now() / 1000)}]`;
            }

            // ----------------------------------------------------

            if (userSettings !== null) {
              // if both Change percentage and Time interval is enabled
              if (userSettings[0]?.enabled == true && userSettings[1]?.enabled == true) {
                //  this.logInfo(`🔔 Both settings are enabled. ${subscriberObj.subscriber}`);

                const settingUserValue1 = userSettings[0].user; // Percent Change
                const settingUserValue2 = userSettings[1].user == 0 ? 3 : userSettings[1].user; // Time interval

                // Case for if user opts-in, opts-out and again opts-in later in time interval
                const presentInDb = (await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber }))
                  ? true
                  : false;

                if (presentInDb) {
                  const userDBValueCheck = await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber });

                  if (Number(userDBValueCheck.lastCycle + settingUserValue2) < Number(CYCLES)) {
                    // Set current cycle as lastCycle
                    await btcTickerUserModel.findOneAndUpdate(
                      { _id: subscriberObj.subscriber },
                      { lastCycle: CYCLES },
                      { upsert: true },
                    );

                    const userLastCycleValue = await btcTickerUserModel.findOne({
                      _id: subscriberObj.subscriber,
                    });
                    this.logInfo(
                      `👋 UserLastCycleValue (${subscriberObj.subscriber}): ` + userLastCycleValue.lastCycle,
                    ); // 45
                  }
                }

                // --------------------------------------------------------------------------------

                // Check if user changed their settings
                const userDBValueBefore =
                  (await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber })) ||
                  (await btcTickerUserModel.create({
                    _id: subscriberObj.subscriber,
                    lastCycle: CYCLES,
                    settingsValue: settingUserValue2,
                  }));

                const userSettingsDBValue = userDBValueBefore.settingsValue ? userDBValueBefore.settingsValue : 0; // 0
                const userChangedValue = userSettingsDBValue != settingUserValue2; // true

                if (userChangedValue) {
                  this.logInfo(
                    '🤯User changed settings value: ' + subscriberObj.subscriber + ' by: ' + settingUserValue2,
                  );

                  await btcTickerUserModel.findOneAndUpdate(
                    { _id: subscriberObj.subscriber },
                    { lastCycle: CYCLES, settingsValue: settingUserValue2 },
                  );
                }

                // ------------------------------------------------------------------------

                const userDBValue = await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber });

                this.logInfo(`Mapped value of ${userDBValue._id} is ${userDBValue.lastCycle} from both price and time`);
                this.logInfo(`User value of ${userDBValue._id} is ${settingUserValue2} from both price and time`);
                this.logInfo(
                  `🔽User value in db of ${userDBValue._id} is ${userDBValue.settingsValue} from both price and time`,
                );

                if (userDBValue.lastCycle + settingUserValue2 == CYCLES) {
                  if (changePercentage >= settingUserValue1) {
                    // UPDATE the users mapped value in DB
                    //  this.logInfo(`This address will receive the notif for both change: ${subscriberObj.subscriber}`);
                    await btcTickerUserModel.findOneAndUpdate(
                      { _id: subscriberObj.subscriber },
                      { lastCycle: CYCLES, lastBtcPrice: Number(formattedPrice) },
                      { upsert: true },
                    );

                    // Sending Notification
                    try {
                      // Build Payload
                      const payload = {
                        type: 3, // Type of Notification
                        notifTitle: title, // Title of Notification
                        notifMsg: message, // Message of Notification
                        title: payloadTitle, // Internal Title
                        msg: payloadMsg, // Internal Message
                        recipient: subscriberObj.subscriber, // Recipient
                      };

                      // Send notification
                      this.sendNotification({
                        recipient: payload.recipient, // new
                        title: payload.notifTitle,
                        message: payload.notifMsg,
                        payloadTitle: payload.title,
                        payloadMsg: payload.msg,
                        notificationType: payload.type,
                        simulate: simulate,
                        image: null,
                      });
                    } catch (error) {
                      this.logError(`Error sending notification: ${error}`);
                    }
                  } else {
                    // UPDATE the users mapped value in DB
                    await btcTickerUserModel.findOneAndUpdate(
                      { _id: subscriberObj.subscriber },
                      { lastCycle: CYCLES, lastBtcPrice: Number(formattedPrice) },
                      { upsert: true },
                    );
                  }
                }
              }
              // if only Change percentage is enabled
              else if (userSettings[0]?.enabled === true) {
                //  this.logInfo(`💲 Change percentage settings is enabled. ${subscriberObj.subscriber}`);

                const settingUserValue1 = userSettings[0].user; // Percent Change

                if (Math.abs(Number(globalChangePercentage)) >= settingUserValue1) {
                  // Sending Notification
                  try {
                    // Build Payload
                    const payload = {
                      type: 3, // Type of Notification
                      notifTitle: title, // Title of Notification
                      notifMsg: message, // Message of Notification
                      title: payloadTitle, // Internal Title
                      msg: globalPayloadMsg, // Internal Message
                      recipient: subscriberObj.subscriber, // Recipient
                    };

                    // Send notification
                    this.sendNotification({
                      recipient: payload.recipient, // new
                      title: payload.notifTitle,
                      message: payload.notifMsg,
                      payloadTitle: payload.title,
                      payloadMsg: payload.msg,
                      notificationType: payload.type,
                      simulate: simulate,
                      image: null,
                    });
                  } catch (error) {
                    this.logError(`Error sending notification: ${error}`);
                  }
                }
              }
              // if only Time interval is enabled
              else if (userSettings[1]?.enabled === true) {
                //  this.logInfo(`⌚ Time Interval settings is enabled. ${subscriberObj.subscriber}`);

                const settingUserValue2 = userSettings[1].user == 0 ? 3 : userSettings[1].user; // Time interval

                // Case for if user opts-in, opts-out and again opts-in later in time interval
                const presentInDb = (await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber }))
                  ? true
                  : false;

                if (presentInDb) {
                  const userDBValueCheck = await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber });

                  if (Number(userDBValueCheck.lastCycle + settingUserValue2) < Number(CYCLES)) {
                    // Set current cycle as lastCycle
                    await btcTickerUserModel.findOneAndUpdate(
                      { _id: subscriberObj.subscriber },
                      { lastCycle: CYCLES },
                      { upsert: true },
                    );

                    const userLastCycleValue = await btcTickerUserModel.findOne({
                      _id: subscriberObj.subscriber,
                    });
                    this.logInfo(
                      `👋 UserLastCycleValue (${subscriberObj.subscriber}): ` + userLastCycleValue.lastCycle,
                    ); // 45
                  }
                }

                // --------------------------------------------------------------------------------

                // Check if user changed their settings
                const userDBValueBefore =
                  (await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber })) ||
                  (await btcTickerUserModel.create({
                    _id: subscriberObj.subscriber,
                    lastCycle: CYCLES,
                    settingsValue: settingUserValue2,
                  }));

                const userSettingsDBValue = userDBValueBefore.settingsValue ? userDBValueBefore.settingsValue : 0; // 0
                const userChangedValue = userSettingsDBValue != settingUserValue2; // true

                if (userChangedValue) {
                  this.logInfo(
                    '🤯User changed settings value: ' + subscriberObj.subscriber + ' by: ' + settingUserValue2,
                  );

                  await btcTickerUserModel.findOneAndUpdate(
                    { _id: subscriberObj.subscriber },
                    { lastCycle: CYCLES, settingsValue: settingUserValue2 },
                  );
                }

                // ------------------------------------------------------------------------

                const userDBValue = await btcTickerUserModel.findOne({ _id: subscriberObj.subscriber });

                this.logInfo(`Mapped value of ${userDBValue._id} is ${userDBValue.lastCycle} from both price and time`);
                this.logInfo(`User value of ${userDBValue._id} is ${settingUserValue2} from both price and time`);
                this.logInfo(
                  `🔽User value in db of ${userDBValue._id} is ${userDBValue.settingsValue} from both price and time`,
                );

                if (userDBValue.lastCycle + settingUserValue2 == CYCLES) {

                  // UPDATE the users mapped value in DB
                  await btcTickerUserModel.findOneAndUpdate(
                    { _id: subscriberObj.subscriber },
                    { lastCycle: CYCLES, lastBtcPrice: Number(formattedPrice) },
                    { upsert: true },
                  );

                  // Sending Notification
                  try {
                    // Build Payload
                    const payload = {
                      type: 3, // Type of Notification
                      notifTitle: title, // Title of Notification
                      notifMsg: message, // Message of Notification
                      title: payloadTitle, // Internal Title
                      msg: payloadMsg, // Internal Message
                      recipient: subscriberObj.subscriber, // Recipient
                    };

                    // Send notification
                    this.sendNotification({
                      recipient: payload.recipient, // new
                      title: payload.notifTitle,
                      message: payload.notifMsg,
                      payloadTitle: payload.title,
                      payloadMsg: payload.msg,
                      notificationType: payload.type,
                      simulate: simulate,
                      image: null,
                    });
                  } catch (error) {
                    this.logError(`Error sending notification: ${error}`);
                  }
                }
              }
            } else {
              //  this.loginfo('🤷‍♂️ No settings found for user: ' + subscriberObj.subscriber);
              //Send Notifications to old users
              // Build Payload
              await btcTickerUserModel.findOneAndUpdate(
                { _id: subscriberObj.subscriber },
                { lastCycle: CYCLES, lastBtcPrice: Number(formattedPrice) },
                { upsert: true },
              );

              try {
                // Build Payload
                const payload = {
                  type: 3, // Type of Notification
                  notifTitle: title, // Title of Notification
                  notifMsg: message, // Message of Notification
                  title: payloadTitle, // Internal Title
                  msg: payloadMsg, // Internal Message
                  recipient: subscriberObj.subscriber, // Recipient
                };

                // Send notification
                this.sendNotification({
                  recipient: payload.recipient, // new
                  title: payload.notifTitle,
                  message: payload.notifMsg,
                  payloadTitle: payload.title,
                  payloadMsg: payload.msg,
                  notificationType: payload.type,
                  simulate: simulate,
                  image: null,
                });
              } catch (error) {
                    this.logError(`Error sending notification: ${error}`);
              }
            }
          }),
        );
      }
    } catch (error) {
      this.logger.error(`Unable to reach CMC API, error: ${error}`);
    }
  }
}
