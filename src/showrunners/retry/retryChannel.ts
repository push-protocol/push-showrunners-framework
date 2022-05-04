import { Service, Inject, Container } from 'typedi';
import { EPNSChannel } from '../../helpers/epnschannel';
import config, { defaultSdkSettings } from '../../config';
import retrySettings from './retrySettings.json';
import { Logger } from 'winston';

@Service()
export default class retryChannel extends EPNSChannel {
  failedNotificationsModel: any;
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Retry',
      url: 'https://epns.io/',
      useOffChain: true,
    });
  }

  /**
   * A function to resend failed notificationss
   */
  public async sendMessageToContract(simulate: any) {
    const sdk = await this.getSdk();
    // Get all the parameters needed from the DB
    this.failedNotificationsModel = Container.get('retryModel');
    const limit = retrySettings.BATCH_LIMIT;
    const retryLimit = retrySettings.MAX_RETRIES;

    const allFailedNotifications = await this.failedNotificationsModel
      .find({
        retryCount: { $lt: retryLimit },
      })
      .limit(limit);

    // // Send a direct notification using those parameters
    const allSentNotificationsPromises = allFailedNotifications.map(async (oneNotification: any) => {
      const { payload } = oneNotification;
      // attempt to resend payload
      const response = await sdk.advanced.sendOffchainNotification(payload);

      const { retry } = response;
      //     // resend each failed notification
      if (!retry) {
        await oneNotification.delete();
      } else {
        // update usual fields
        oneNotification.retryCount += 1;
        oneNotification.lastAttempted = new Date();
        await oneNotification.save();
      }

      return response;
    });
    // // If it passes, then remove it from queue

    return await Promise.all(allSentNotificationsPromises);
  }
}
