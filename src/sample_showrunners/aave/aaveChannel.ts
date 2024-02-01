// @name: Aave Channel
// @version: 1.3.0
// @changes : Implemented Slider type notifications for Supply and borrow APY in Aave(v3)

import { Service, Inject } from 'typedi';
import config from '../../config';
import { ethers } from 'ethers';
import keys from "./aaveKeys.json";
import aaveSettings from './aaveSettings.json';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import aaveLendingPoolDeployedContractABI from './aave_LendingPool.json';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import aavePoolDataProviderAbi from "./aavePoolDataProvidrAbi.json";

const NETWORK_TO_MONITOR = aaveSettings.MainnetProvider;
const provider = new ethers.providers.JsonRpcProvider(config.web3MainnetProvider || aaveSettings.MainnetProvider);
const signer = new ethers.Wallet(keys.PRIVATE_KEY_NEW_STANDARD.PK, provider);
const CUSTOMIZABLE_SETTINGS = {
  precision: 3,
};

@Service()
export default class AaveChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject("cached") public cached) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'Aave',
      url: 'https://aave.com/',
      useOffChain: true,
    });
  }
  tokens: string[] = [];
  supplyApy: string[] = [];
  borrowApy: string[] = [];
  // To form and write to smart contract
  public async getUserSettings(simulate) {
    const userAlice = await PushAPI.initialize(signer, { env: CONSTANTS.ENV.STAGING });
    //simulate object settings START
    const logicOverride =
      typeof simulate == 'object'
        ? simulate.hasOwnProperty('logicOverride') && simulate.logicOverride.mode
          ? simulate.logicOverride.mode
          : false
        : false;


    let status: boolean = false;
    status = await this.getData();
    if (status) {
      let i = 1;

      while (true) {
        const userData: any = await userAlice.channel.subscribers({
          page: i,
          limit: 30,
          setting: true,
        });
        if (userData.itemcount != 0) {
          i++;
          userData.subscribers.map((subscriberObj) => {
            const userSettings = JSON.parse(subscriberObj.settings);
            if (userSettings !== null) {

              // this.logInfo("User Info" + JSON.stringify(userSettings[0]));
              userSettings.map(async (settings) => {
                if (settings.index == 1 && settings.enabled == true) {
                  // Aave user settings Enabled.
                  let temp = userSettings[0];
                  let lowerLimit = JSON.stringify(temp.user.lower);
                  let upperLimit = JSON.stringify(temp.user.upper);
                  this.checkHealthFactor(subscriberObj.subscriber, Number(lowerLimit), Number(upperLimit), simulate);
                }
                else if (settings.index == 1 && settings.enabled == false) {
                  //If User settings Exist but is disabled by the user => send normal notification.
                  this.checkHealthFactor(subscriberObj.subscriber, 0, 3, simulate)
                }
                // Supply APY code goes here -->
                if (settings.index == 2 && settings.enabled == true) {
                  let k = 0;
                  let loopCounter = 0;
                  let title = 'Aave v3 supply APYs are here!';
                  let message = 'Here is a List of Assets that you can supply to on Aave v3';
                  let payloadTitle = 'Aave V3 Supply APY Alert!';
                  let payloadMsg = ``;
                  let notificationType = 3;
                  this.supplyApy.map(async (apy) => {
                    //  console.log(apy);
                    if (Number(apy) >= Number(JSON.stringify(settings.user))) {
                      if (loopCounter % 2 == 0 && loopCounter != 1) {
                        let sentence = `${this.tokens[k]}'s APY :[d:${apy}]%\t\t`;
                        payloadMsg += sentence;

                      } else {
                        let sentence = `${this.tokens[k]}'s APY :[d:${apy}]%\n`;
                        payloadMsg += sentence;
                      }
                      loopCounter++;
                    }
                    k++;
                  })
                  // console.log("Payload " + payloadMsg)
                  const tx = await this.sendNotification({
                    recipient: subscriberObj.subscriber,
                    title: title,
                    message: message,
                    payloadTitle: payloadTitle,
                    payloadMsg: payloadMsg,
                    notificationType: notificationType,
                    cta: 'https://app.aave.com/#/dashboard',
                    image: null,
                    simulate: simulate,
                  });
                }
                // Borrow APY code goes here -->
                if (settings.index == 3 && settings.enabled == true) {
                  let k = 0;
                  let loopCounter = 0;
                  let title = `Aave v3's Borrow APYs are here!`;
                  let message = 'Here is a List of Assets that you can Borrow on Aave v3';
                  let payloadTitle = 'Aave V3 Borrow APY Alert!';
                  let payloadMsg = ``;
                  let notificationType = 3;
                  this.borrowApy.map(async (apy) => {
                    if (Number(apy) >= Number(JSON.stringify(settings.user))) {
                      if (loopCounter % 2 == 0 && loopCounter != 1) {
                        let sentence = `${this.tokens[k]}'s APY :[d:${apy}]%\t\t`;
                        payloadMsg += sentence;
                      } else {
                        let sentence = `${this.tokens[k]}'s APY :[d:${apy}]%\n`;
                        payloadMsg += sentence;
                      }
                      loopCounter++;
                    }

                    k++;
                  })
                  const tx = await this.sendNotification({
                    recipient: subscriberObj.subscriber,
                    title: title,
                    message: message,
                    payloadTitle: payloadTitle,
                    payloadMsg: payloadMsg,
                    notificationType: notificationType,
                    cta: 'https://app.aave.com/#/dashboard',
                    image: null,
                    simulate: simulate,
                  });
                }
              })
            }
            else {
              // For Users who have not opted into notification setting
              //  this.checkHealthFactor(subscriberObj.subscriber, 0, 3, simulate)
            }
          })
        } else {
          break;
        }
      }
      this.logInfo("-------------[ JOB Finished ]------------------");
      return true;
    }
  }
  public async checkHealthFactor(userAddress, lowerLimit, upperLimit, simulate) {
    try {
      const logicOverride =
        typeof simulate == 'object'
          ? simulate.hasOwnProperty('logicOverride') && simulate.logicOverride.mode
            ? simulate.logicOverride.mode
            : false
          : false;
      const simulateApplyToAddr =
        logicOverride && simulate.logicOverride.hasOwnProperty('applyToAddr')
          ? simulate.logicOverride.applyToAddr
          : false;
      const simulateAaveNetwork =
        logicOverride && simulate.logicOverride.hasOwnProperty('aaveNetwork')
          ? simulate.logicOverride.aaveNetwork
          : false;

      if (!userAddress) {
        if (simulateApplyToAddr) {
          userAddress = simulateApplyToAddr;
        } else {
          // this.logDebug('userAddress is not defined');
        }
      }
    } catch (err) {
      this.logError('An error occured while checking health factor');
      this.logError(err);
    }
    try{
    let aaveV2 = await this.getContract(
      aaveSettings.aaveLendingPoolDeployedContractMainnet,
      JSON.stringify(aaveLendingPoolDeployedContractABI),
    );
    let aaveV3 = await this.getContract(
      aaveSettings.aaveV3PoolContractMainnet,
      JSON.stringify(aaveLendingPoolDeployedContractABI),
    );
    // console.log("User Address"+userAddress);
    //simulate object settings END
    const aaveV2UserData = await aaveV2?.contract.getUserAccountData(userAddress);
    const aaveV3UserData = await aaveV3?.contract.getUserAccountData(userAddress);
    let healthFactorV2 = ethers.utils.formatEther(aaveV2UserData.healthFactor);
    let healthFactorV3 = ethers.utils.formatEther(aaveV3UserData.healthFactor);
    // console.log(`HF of ${userAddress} is ${healthFactorV3}`)
    // this.logInfo('For wallet: %s, Health Factor: %o', userAddress, healthFactor);
    if (Number(healthFactorV2).toFixed(2) >= lowerLimit && Number(healthFactorV2).toFixed(2) <= upperLimit) {
      //  this.logInfo("Aave v2 Notification sending to " + userAddress);
      const precision = CUSTOMIZABLE_SETTINGS.precision;
      const newHealthFactor = parseFloat(healthFactorV2).toFixed(precision);
      const title = 'Aave V2 Liquidation Alert!';
      const message =
        userAddress +
        ' your account has healthFactor ' +
        newHealthFactor +
        '. Maintain it above 1 to avoid liquidation.';
      const payloadTitle = 'Aave V2 Liquidity Alert!';
      const payloadMsg = `Your account on Aave V2 has healthFactor [d:${newHealthFactor}] . Maintain it above 1 to avoid liquidation.`;
      const notificationType = 3;
      const tx = await this.sendNotification({
        recipient: userAddress,
        title: title,
        message: message,
        payloadTitle: payloadTitle,
        payloadMsg: payloadMsg,
        notificationType: notificationType,
        cta: 'https://app.aave.com/#/dashboard',
        image: null,
        simulate: simulate,
      });
    }
    if (Number(healthFactorV3).toFixed(2) >= lowerLimit && Number(healthFactorV3).toFixed(2) <= upperLimit) {
      this.logInfo("Aave v3 Notification sending to " + userAddress);
      const precision = CUSTOMIZABLE_SETTINGS.precision;
      const newHealthFactor = parseFloat(healthFactorV3).toFixed(precision);
      const title = 'Aave V3 Liquidation Alert!';
      const message =
        userAddress +
        ' your account has healthFactor ' +
        newHealthFactor +
        '. Maintain it above 1 to avoid liquidation.';
      const payloadTitle = 'Aave V3 Liquidity Alert!';
      const payloadMsg = `Your account on Aave V3 has healthFactor [d:${newHealthFactor}] . Maintain it above 1 to avoid liquidation.`;
      const notificationType = 3;
      const tx = await this.sendNotification({
        recipient: userAddress,
        title: title,
        message: message,
        payloadTitle: payloadTitle,
        payloadMsg: payloadMsg,
        notificationType: notificationType,
        cta: 'https://app.aave.com/#/dashboard',
        image: null,
        simulate: simulate,
      });
    } else {
      //  this.logInfo(`[Wallet: ${userAddress} is SAFE with Health Factor:: ${healthFactor}`);
    }
    return true;
  }catch(e){
    this.logInfo("Error occured in Aave Liquidity Alert")
  }
  }


  public async getData():Promise<boolean> {
    try{
    let aaveV3 = await this.getContract(
      aaveSettings.aaveV3PoolDataProvider,
      JSON.stringify(aavePoolDataProviderAbi),
    );

    //Re-settings Arrays
    this.tokens.length = 0;
    this.supplyApy.length = 0;
    this.borrowApy.length = 0;

    let aaveV3Tokens = await aaveV3?.contract.getAllReservesTokens();
    let RAY = 10 ** 27 // 10 to the power 27
    let SECONDS_PER_YEAR = 31536000
    // console.log("Tokens"+aaveV3Tokens[1]);
    for (let i = 0; i < aaveV3Tokens.length; i++) {

      let aaveV2APR = await aaveV3?.contract.getReserveData(aaveV3Tokens[i][1]);
      let depositAPR = (aaveV2APR[5] / RAY)
      let variableBorrowAPR = (aaveV2APR[6] / RAY)

      let depositAPY = (((1 + (depositAPR / SECONDS_PER_YEAR)) ** SECONDS_PER_YEAR) - 1) * 100
      let variableBorrowAPY = (((1 + (variableBorrowAPR / SECONDS_PER_YEAR)) ** SECONDS_PER_YEAR) - 1) * 100
      this.tokens.push(aaveV3Tokens[i][0]);
      this.supplyApy.push((depositAPY).toFixed(2));
      this.borrowApy.push(variableBorrowAPY.toFixed(2));

      //  console.log(aaveV3Tokens[i][0] + "[" + depositAPY.toFixed(2) + "," + variableBorrowAPY.toFixed(2) + "]");

    }

  }catch(e){
    this.logInfo("Error occured in Supply Borrow APY in aave")
  }
  return true;
  }

  public async testLogic(healthFactor) {

    if (Number(healthFactor) >= 0 && Number(healthFactor) <= 3) {
      const precision = CUSTOMIZABLE_SETTINGS.precision;
      const newHealthFactor = parseFloat(healthFactor).toFixed(precision);
      return true;
    } else {
      return false;
    }
  }

}
