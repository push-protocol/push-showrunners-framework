import { Service, Inject, Container } from 'typedi';
import { EPNSChannel } from '../../helpers/epnschannel';
import config, { defaultSdkSettings } from '../../config';
import monitoringSettings from './monitoringSettings.json';
import { Logger } from 'winston';
import { NotificationDetailsModel, INotificationDetails } from './monitoringModel';

@Service()
export default class monitoringnChannel extends EPNSChannel {
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
      name: 'Monitoring Dashboard',
      url: 'https://epns.io/',
      useOffChain: true,
    });
  }

  /**
   * A function to resend failed notificationss
   */
  public async getAllNotification(simulate: any) {
    try {
      const data = await NotificationDetailsModel.find({});
      return data;
    } catch (e) {
      this.logError(e);
    }
  }

  public async getChannelNotification(channelName: string) {
    try {
      const data = await NotificationDetailsModel.find({ channelName });
      return data;
    } catch (e) {
      this.logError(e);
    }
  }

  public async getNotificationByDate(query: object) {
    try {
      const data = await NotificationDetailsModel.find(query).sort('-notificationCount').lean();
      return data;
    } catch (e) {
      this.logError(e);
    }
  }
}
