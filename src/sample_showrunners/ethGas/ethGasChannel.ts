// @name: ETH GAS Cnannel
// @version: 1.1.1
// @recent_changes: Changed Price Threshold logic

import { Service, Inject, Container } from "typedi";
import config from "../../config";
import { logger } from "ethers";
import { ethers } from 'ethers';
import { EPNSChannel } from "../../helpers/epnschannel";
import { Logger } from "winston";
import { PushAPI,CONSTANTS } from '@pushprotocol/restapi';
import { settings } from "./ethGasSettings";
import { keys } from "./ethGasKeys";
import { Model } from "mongoose";
import { IGas } from "../../interfaces/IGas";
import axios from "axios";

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;

@Service()
export default class GasStationChannel extends EPNSChannel {
  constructor(
    @Inject("logger") public logger: Logger
  ) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: "ETH Gas",
      url: "https://push.org/",
      useOffChain: true,
      address: "0x2B8ffb4460550Dbe8Ec1cEA9C1B61322dB56B082",
    });
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    await this.getGasPrice(simulate);
  }

  // To get the gas price
  public async getGasPrice(simulate) {
    const provider = new ethers.providers.JsonRpcProvider(settings.mainnerProvider);
    const signer = new ethers.Wallet(`${keys.PRIVATE_KEY_NEW_STANDARD.PK}`, provider);
    const logger = this.logger;
    logger.debug(
      `[${new Date(
        Date.now()
      )}]-[ETH Gas]- Getting gas price from ETH Gas Station`
    );
    const gasroute = "https://api.etherscan.io/api?module=gastracker&action=gasoracle";
    const pollURL = `${gasroute}&apikey=${settings.gasApiKey}`;
    axios.get(pollURL)
      .then(async function (response) {
        // handle success
        let lowGasPrice = parseFloat(response.data.result.SafeGasPrice).toFixed(2);
        let avgGasPrice = parseFloat(response.data.result.ProposeGasPrice).toFixed(2);
       let highGasPrice = parseFloat(response.data.result.FastGasPrice).toFixed(2);
        //Prepare notification payload
        let title;
        let payloadTitle;
        let message;
        let payloadMsg;

        if (Number(avgGasPrice) > 7) {
          // Gas is high
          title = "Eth Gas Price Movement";
          payloadTitle = `Eth Gas Price Movement ⬆`;
          message = `Eth Gas Price is over the usual average, current cost: ${lowGasPrice} Gwei`;
          payloadMsg = `[t:⬆] Gas Price are above the normal rates.\n\n
          **Low** : <span color='#12B293'>${lowGasPrice} Gwei</span>\n
          **Average** : ${avgGasPrice} Gwei\n
          **High** : <span color='#EE493E'> ${highGasPrice} Gwei</span>
          [timestamp: ${Math.floor(
            Date.now() / 1000
          )}]`;
        } else {
          // Gas price are low
          title = "Eth Gas Price Movement";
          payloadTitle = `Eth Gas Price Movement`;
          message = `Eth Gas Price check, current cost: ${lowGasPrice} Gwei`;
          payloadMsg = `Gas Price is at normal rate.\n
          **Low** : <span color='#12B293'>${lowGasPrice} Gwei</span>\n
          **Average** : ${avgGasPrice} Gwei\n
          **High** : <span color='#EE493E'> ${highGasPrice} Gwei</span>
          [timestamp: ${Math.floor(
            Date.now() / 1000
          )}]`;
        }
        console.log("Payload",payloadMsg)
        const notificationType = 1; //broadcasted notification
        const ethGasChannel = Container.get(GasStationChannel);
        try {
          let userAlice = await PushAPI.initialize(signer, { env: CONSTANTS.ENV.PROD });
          this.logInfo("+++++++ETH GAS CHANNEL++++++++");
         /*  await userAlice.channel.send(['*'], {
            notification: { title: title, body: `${message} [timestamp: ${Math.floor(Date.now() / 1000)}]` },
            payload: { title: payloadTitle, body: payloadMsg, cta: "https://etherscan.io/gastracker" },
            channel: "0x2B8ffb4460550Dbe8Ec1cEA9C1B61322dB56B082"
          }); */
        } catch (error) { ethGasChannel.logInfo("Error in sending notification", error) }
      })

  }

}
