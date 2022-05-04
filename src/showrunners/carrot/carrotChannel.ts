import { EPNSChannel } from '../../helpers/epnschannel';
import config, { defaultSdkSettings } from '../../config';
import { Logger } from 'winston';
import { Inject, Service } from 'typedi';
import axios from 'axios';
import carrotSettings from './carrotSettings.json';
import { add } from 'lodash';

@Service()
export default class CarrotChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'CARROT',
      url: 'https://carrot.eth.limo/',
      useOffChain: true,
    });
  }

  async farmerNotification(simulate) {
    try {
      //   const contractAddressHash = '0x2569Db67431b30f027083345208E77232F470e7f';
      const res = await axios.get(
        `https://blockscout.com/xdai/mainnet/api?module=token&action=getTokenHolders&contractaddress=${carrotSettings.tokenContractAddress}&offset=300`,
      );
      if (res.data) {
        res.data.result.push('0xA35150f3537f473eBedCAfA53E86038ae14E2233');
        res.data.result.forEach(async (tokenHolder, index) => {
          const { address, value } = tokenHolder;
          //send Notification here
          //cta link = https://carrot.eth.limo/#/campaigns/0x8d96b649698862bb79638b5e6a249dfee4bf9c2e0e153033da7c5a84a94d94e9?chainId=100

          const title = `Carrot Redemption Alert`;
          const payloadTitle = title;
          const msg = `Your wallet has "gCOWETHTVL-0414" tokens that are now redeemable for the underlying collateral.`;
          const payloadMsg = msg;
          const notificationType = 3;
          const cta = `https://carrot.eth.limo/#/campaigns/0x8d96b649698862bb79638b5e6a249dfee4bf9c2e0e153033da7c5a84a94d94e9?chainId=100`;
          await this.sendNotification({
            title,
            payloadTitle,
            message: msg,
            payloadMsg,
            simulate,
            image: null,
            recipient: address,
            notificationType,
            cta,
          });
        });
      }
    } catch (e) {
      this.logError(e);
    }
  }
}
