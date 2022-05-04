import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';

import { mockMessages } from './messages';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

@Service()
export default class HelloWorldChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Hello World',
      url: 'https://epns.io/',
      useOffChain: true,
    });
  }
  // Checks for profile Expiration and Sends notification to users
  // Whose Profile is about to be expired
  async helloWorld(simulate) {
    try {
      let sdk = await this.getSdk();

      this.logInfo('Sending notification to evidence provider');

      for (const e of mockMessages.messages) {
        await this.sendNotification({
          recipient: this.channelAddress,
          title: e.title,
          message: e.msg,
          payloadTitle: e.title,
          payloadMsg: e.msg,
          notificationType: 1,
          cta: e.cta,
          image: null,
          simulate: simulate,
        });
      }

      return { success: true };
    } catch (error) {
      this.logError(error);
    }
  }
}
