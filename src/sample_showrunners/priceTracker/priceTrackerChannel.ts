import { Inject, Service } from 'typedi';
import { Logger } from 'winston';
import config from '../../config';
import settings from './priceTrackerSettings.json';
import { EPNSChannel } from '../../helpers/epnschannel';
import keys from './priceTrackerKeys.json';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { ethers } from 'ethers';
import axios from 'axios';

import { priceTrackerModel, priceTrackerGlobalModel, priceTrackerTokenModel } from './priceTrackerModel';

const bent = require('bent'); // Download library

const NETWORK_TO_MONITOR = config.web3TestnetSepoliaNetwork;

@Service()
export default class PricetrackerChannel extends EPNSChannel {
  model: any;
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'Price Tracker',
      url: 'https://push.org/',
      useOffChain: true,
    });
  }

  public async triggerUserNotification(simulate) {
    const logger = this.logger;

    try {
      this.logInfo(`🔔🔔Sending notifications`);

      // Get New price function call
      await this.getNewPrice(simulate);
    } catch (error) {
      logger.error(`[${new Date(Date.now())}]-[Price Tracker]- Errored on CMC API... skipped with error: %o`, err);
    }
  }

  public async getNewPrice(simulate) {
    try {
      const logger = this.logger;
      logger.debug(`[${new Date(Date.now())}]-[Pricetracker]-Getting price of tokens... `);

      // API URL components and settings
      const cmcroute = settings.route;
      const cmcEndpoint = settings.cmcEndpoint;
      const pollURL = `${cmcEndpoint}${cmcroute}?id=${settings.id}&aux=cmc_rank&CMC_PRO_API_KEY=${
        settings.cmcKey || config.cmcAPIKey
      }`;

      // Fetching data from the CMC API
      let { data } = await axios.get(pollURL);
      data = data.data;

      // Initalize provider, signer and userAlice for Channel interaction
      const provider = new ethers.providers.JsonRpcProvider(config.web3TestnetSepoliaProvider || settings.providerUrl);
      const signer = new ethers.Wallet(keys.PRIVATE_KEY_NEW_STANDARD.PK, provider);
      const userAlice = await PushAPI.initialize(signer, { env: CONSTANTS.ENV.STAGING });

      // Global variables
      let i = 1;
      let tokenInfo = [];

      // Structuring token data info
      for (let id in data) {
        let tokenPrice = data[id].quote.USD?.price;
        let tokenSymbol = data[id].symbol;
        let formattedPrice = Number(Number(tokenPrice).toFixed(2));
        tokenInfo.push({ symbol: tokenSymbol, price: formattedPrice });
      }

      // Temp
      // await priceTrackerGlobalModel.findOneAndUpdate({ _id: 'global' }, { cycles: 0 }, { upsert: true });

      // Global variables from DB
      const priceTrackerGlobalData =
        (await priceTrackerGlobalModel.findOne({ _id: 'global' })) ||
        (await priceTrackerGlobalModel.create({
          _id: 'global',
          cycles: 0,
        }));

      // Set CYCLES variable in DB
      const CYCLES = priceTrackerGlobalData.cycles; // priceTrackerGlobalData.cycles

      // Looping for subscribers' data in the channel
      while (true) {
        const userData: any = await userAlice.channel.subscribers({
          page: i,
          limit: 30,
          setting: true,
        });

        if (userData.itemcount != 0) {
          i++;
        } else {
          i = 1;

          // UPDATE CYCLES VALUE
          // HERE
          await priceTrackerGlobalModel.findOneAndUpdate({ _id: 'global' }, { $inc: { cycles: 3 } }, { upsert: true });
          const ethTickerGlobalData = await priceTrackerGlobalModel.findOne({ _id: 'global' });

          this.logInfo(`Cycles value after all computation: ${ethTickerGlobalData.cycles}`);

          break;
        }

        // Looping through all subscribers here for userSettings
        try {
          await Promise.all(
            userData?.subscribers?.map(async (subscriberObj: { settings: string; subscriber: any }) => {
              // Converting String to JS object
              let userSettings = JSON.parse(subscriberObj?.settings);

              // For merging different token detals in payload
              const notifData2 = [];

              // Only perform computation if user settings exist
              try {
                if (userSettings !== null) {
                  // Looping through userSettings to handle each userSetting
                  await Promise.all(
                    userSettings?.map(async (mapObj, index) => {
                      // If subscriber is subscribed to the setting
                      if (mapObj.user == true && mapObj.type == 1) {
                        // Get current price of the token
                        const currentToken = tokenInfo.find((obj) => obj.symbol === mapObj.description);
                        const currentPrice = currentToken?.price;

                        // Get previous token price
                        const previousPriceData = (await priceTrackerTokenModel.findOne({ _id: mapObj.description }))
                          ? await priceTrackerTokenModel.findOne({ _id: mapObj.description })
                          : 0;

                        // Update the new price
                        await priceTrackerTokenModel.findOneAndUpdate(
                          { _id: mapObj.description },
                          { tokenPrevPrice: currentPrice },
                          { upsert: true },
                        );

                        // Calculate Change
                        // const changePercentage = ((Math.abs(Number(currentPrice) - previousPriceData.tokenPrevPrice) / previousPriceData.tokenPrevPrice) * 100).toFixed(2);
                        const changePercentage = (
                          ((Number(currentPrice) - previousPriceData.tokenPrevPrice) /
                            previousPriceData.tokenPrevPrice) *
                          100
                        ).toFixed(2);

                        // The 4 conditions here
                        // index - 9 ---> Time Interval
                        // index - 10 ---> Price Change
                        if (userSettings[9]?.enabled == true && userSettings[10]?.enabled == true) {
                          this.logInfo(`Price Alert & Time Interval Slider case: ${subscriberObj.subscriber}`);

                          // Fetch user values for settings
                          let userValueTime = userSettings[9].user == 0 ? 3 : userSettings[9].user;
                          let userValuePrice = userSettings[10].user;

                          // Case for if user opts-in, opts-out and again opts-in later in time interval
                          const presentInDb = (await priceTrackerModel.findOne({ _id: subscriberObj.subscriber }))
                            ? true
                            : false;

                          if (presentInDb) {
                            const userDBValueCheck = await priceTrackerModel.findOne({ _id: subscriberObj.subscriber });

                            if (Number(userDBValueCheck.lastCycle + userValueTime) < Number(CYCLES)) {
                              // Set current cycle as lastCycle
                              await priceTrackerModel.findOneAndUpdate(
                                { _id: subscriberObj.subscriber },
                                { lastCycle: CYCLES },
                                { upsert: true },
                              );

                              const userLastCycleValue = await priceTrackerModel.findOne({
                                _id: subscriberObj.subscriber,
                              });
                              this.logInfo(
                                `👋 UserLastCycleValue (${subscriberObj.subscriber}): ` + userLastCycleValue.lastCycle,
                              ); // 45
                            }
                          }

                          // --------------------------------------------------------------------------------

                          const userDBValueBefore =
                            (await priceTrackerModel.findOne({ _id: subscriberObj.subscriber })) ||
                            (await priceTrackerModel.create({
                              _id: subscriberObj.subscriber,
                              lastCycle: CYCLES,
                              settingsValue: userValueTime,
                            }));

                          // Check if user changed their settings
                          const userSettingsDBValue = userDBValueBefore.settingsValue
                            ? userDBValueBefore.settingsValue
                            : 0; // 0
                          const userChangedValue = userSettingsDBValue != userValueTime; // true

                          if (userChangedValue) {
                            this.logInfo(
                              '🤯User changed settings value: ' + subscriberObj.subscriber + ' by: ' + userValueTime,
                            );

                            await priceTrackerModel.findOneAndUpdate(
                              { _id: subscriberObj.subscriber },
                              { lastCycle: CYCLES, settingsValue: userValueTime },
                            );
                          }

                          const userDBValue = await priceTrackerModel.findOne({ _id: subscriberObj.subscriber });

                          this.logInfo(
                            `Mapped value of ${userDBValue._id} is ${userDBValue.lastCycle} from both price and time`,
                          );
                          this.logInfo(`User value of ${userDBValue._id} is ${userValueTime} from both price and time`);
                          this.logInfo(
                            `🔽User value in db of ${userDBValue._id} is ${userDBValue.settingsValue} from both price and time`,
                          );

                          // Condition to trigger notification

                          // Math.abs(Number(changePercentage)) >= userValuePrice &&
                          //  userDBValue.lastCycle + userValueTime == CYCLES
                          if (userDBValue.lastCycle + userValueTime == CYCLES) {
                            // Math.abs(Number(changePercentage)) >= userValuePrice && userDBValue.lastCycle + userValueTime == CYCLES
                            if (Math.abs(Number(changePercentage)) >= userValuePrice) {
                              // UPDATE the users mapped value in DB
                              await priceTrackerModel.findOneAndUpdate(
                                { _id: subscriberObj.subscriber },
                                { lastCycle: CYCLES },
                                { upsert: true },
                              );

                              // Build the payload of the notification
                              const payloadMsg =
                                Number(changePercentage) > 0
                                  ? `Percentage Change (${mapObj.description}): [s:+${Math.abs(
                                      Number(changePercentage),
                                    )}% ($ ${currentPrice})]\n `
                                  : `Percentage Change (${mapObj.description}): [d:-${Math.abs(
                                      Number(changePercentage),
                                    )}% ($ ${currentPrice})]\n `;

                              notifData2.push({ key: `${Math.abs(Number(changePercentage))}`, notif: `${payloadMsg}` });
                            } else {
                              // UPDATE the users mapped value in DB
                              await priceTrackerModel.findOneAndUpdate(
                                { _id: subscriberObj.subscriber },
                                { lastCycle: CYCLES },
                                { upsert: true },
                              );
                            }
                          }
                        } else if (userSettings[10]?.enabled == true) {
                          this.logInfo(`Price Alert Slider only case: ${subscriberObj.subscriber}`);

                          // Fetch user values for settings
                          let userValue = userSettings[10].user;

                          // Condition to trigger notification
                          if (Math.abs(Number(changePercentage)) >= userValue) {
                            // Math.abs(Number(changePercentage)) >= userValue
                            //  this.logInfo(`Sending notif to ${userValue}`)

                            // Build the payload of the notification
                            const payloadMsg =
                              Number(changePercentage) > 0
                                ? `Percentage Change (${mapObj.description}): [s:+${Math.abs(
                                    Number(changePercentage),
                                  )}% ($ ${currentPrice})]\n `
                                : `Percentage Change (${mapObj.description}): [d:-${Math.abs(
                                    Number(changePercentage),
                                  )}% ($ ${currentPrice})]\n `;

                            notifData2.push({ key: `${Math.abs(Number(changePercentage))}`, notif: `${payloadMsg}` });
                          }
                        } else if (userSettings[9]?.enabled == true) {
                          this.logInfo(`Time Interval Slider only case: ${subscriberObj.subscriber}`);

                          // Fetch user values for settings
                          let userValue = userSettings[9].user == 0 ? 3 : userSettings[9].user;

                          // Case for if user opts-in, opts-out and again opts-in later in time interval
                          const presentInDb = (await priceTrackerModel.findOne({ _id: subscriberObj.subscriber }))
                            ? true
                            : false;

                          if (presentInDb) {
                            const userDBValueCheck = await priceTrackerModel.findOne({ _id: subscriberObj.subscriber });

                            if (Number(userDBValueCheck.lastCycle + userValue) < Number(CYCLES)) {
                              // Set current cycle as lastCycle
                              await priceTrackerModel.findOneAndUpdate(
                                { _id: subscriberObj.subscriber },
                                { lastCycle: CYCLES },
                                { upsert: true },
                              );

                              const userLastCycleValue = await priceTrackerModel.findOne({
                                _id: subscriberObj.subscriber,
                              });
                              this.logInfo(
                                `👋 UserLastCycleValue (${subscriberObj.subscriber}): ` + userLastCycleValue.lastCycle,
                              ); // 45
                            }
                          }

                          const userDBValueBefore =
                            (await priceTrackerModel.findOne({ _id: subscriberObj.subscriber })) ||
                            (await priceTrackerModel.create({
                              _id: subscriberObj.subscriber,
                              lastCycle: CYCLES,
                              settingsValue: userValue,
                            }));

                          // Check if user changed their settings
                          const userSettingsDBValue = userDBValueBefore.settingsValue
                            ? userDBValueBefore.settingsValue
                            : 0; // 0
                          const userChangedValue = userSettingsDBValue != userValue; // true

                          if (userChangedValue) {
                            this.logInfo(
                              '🤯User changed settings value: ' + subscriberObj.subscriber + ' by: ' + userValue,
                            );

                            await priceTrackerModel.findOneAndUpdate(
                              { _id: subscriberObj.subscriber },
                              { lastCycle: CYCLES, settingsValue: userValue },
                            );
                          }

                          const userDBValue = await priceTrackerModel.findOne({ _id: subscriberObj.subscriber });

                          this.logInfo(`Mapped value of ${userDBValue._id} is ${userDBValue.lastCycle} from only time`);
                          this.logInfo(`User value of ${userDBValue._id} is ${userValue} from only time`);
                          this.logInfo(`Cycles value ${CYCLES} before computation from only time`);
                          this.logInfo(
                            `🔽User value in db of ${userDBValue._id} is ${userDBValue.settingsValue} from both price and time`,
                          );

                          if (userDBValue.lastCycle + userValue == CYCLES) {
                            // userDBValue.lastCycle + userValue == CYCLES
                            // userDBValue.lastCycle + 6 == CYCLES
                            // userValue = 210, CYCLES

                            // UPDATE the users mapped value in DB
                            await priceTrackerModel.findOneAndUpdate(
                              { _id: subscriberObj.subscriber },
                              { lastCycle: CYCLES },
                              { upsert: true },
                            );

                            // Build the payload of the notification
                            const payloadMsg = `${mapObj.description} at [d:$${currentPrice}]\n `;

                            notifData2.push({ key: `${currentPrice}`, notif: `${payloadMsg}` });
                          }
                        } else {
                          this.logInfo('-------Executing the New case---------');

                          // Build the payload of the notification
                          const payloadMsg = `${mapObj.description} at [d:$${currentPrice}]\n `;

                          notifData2.push({ key: `${currentPrice}`, notif: `${payloadMsg}` });
                        }
                      }
                    }),
                  );

                  try {
                    // Build a payload using the array
                    const title = 'Token Price Movements';
                    const message = 'Hey👋! Here is your token movements. Check it out!!';
                    const payloadTitle = 'Token Price Movement';

                    let payloadMsg = '';

                    // Sort array in descending order
                    const sortedPayload = notifData2.sort((a, b) => b.key - a.key);

                    for (let i = 0; i < sortedPayload.length; i++) {
                      payloadMsg += sortedPayload[i].notif;
                    }

                    const payload = {
                      type: 3, // Type of Notification
                      notifTitle: title, // Title of Notification
                      notifMsg: message, // Message of Notification
                      title: payloadTitle, // Internal Title
                      msg: payloadMsg, // Internal Message
                      recipient: subscriberObj.subscriber, // Recipient
                    };

                    this.logInfo('📄: ' + JSON.stringify(payload));

                    // Send a notification only is body exists
                    if (payload.msg !== '') {
                      this.logInfo('🎺 Notification to this Address: ' + payload.recipient);
                      //   this.sendNotification({
                      //     recipient: payload.recipient, // new
                      //     title: payload.notifTitle,
                      //     message: payload.notifMsg,
                      //     payloadTitle: payload.title,
                      //     payloadMsg: payloadMsg,
                      //     notificationType: 3,
                      //     simulate: simulate,
                      //     image: null,
                      //   });
                    }
                  } catch (error) {
                    throw {
                      error: error,
                      message: `Error Sending Notification: ${error.message}`,
                    };
                  }
                }
              } catch (error) {
                this.logError(`Error Parsing user-settings: ${error.message}`);
              }
            }),
          );
        } catch (error) {
          this.logError(`Error Parsing user-settings: ${error.message}`);
        }
      }
    } catch (error) {
      this.logError(`💀💀⚡⚡ERROR OCCURED getNewPrice(), ${error.message}`);
    }
  }
}
