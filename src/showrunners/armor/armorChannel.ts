import { BigNumber, Contract } from 'ethers';
import { Inject, Token } from 'typedi';
import { BaseProvider } from '@ethersproject/providers';
import channelSettings from './armorSettings.json';
import abi from './arNFT.json';
import config, { defaultSdkSettings } from '../../config';
import { Logger } from 'winston';
import { EPNSChannel } from '../../helpers/epnschannel';



interface ArNFT {
  cid: BigNumber;
  status: number;
  sumAssured: BigNumber;
  coverPeriod: number;
  validUntil: BigNumber;
  scAddress: string;
  currencyCode: any;
  premiumNXM: BigNumber;
  coverPrice: BigNumber;
  claimid: BigNumber;
}

const BLOCK_NUMBER = 'block_number';
export class ArmorChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') private cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Armor',
      url: 'https://armor.fi/',
      useOffChain: true,
      address:"0x5afedef166bd626b3043cb1d53e16ea9bf863e06"
    });
  }
  // constructor(@Inject('logger') private logger,) {}

  async getHelpers(simulate) {
    this.log('Getting Helpers');
    let sdks = await this.getSdks();
    let sdk = sdks.sdk;
    let cntrct = await sdk.getContract(channelSettings.arNFTAddress, JSON.stringify(abi));

    const logicOverride =
      typeof simulate == 'object'
        ? simulate.hasOwnProperty('logicOverride') && simulate.logicOverride.mode
          ? simulate.logicOverride.mode
          : false
        : false;

    // Initailize block if it is missing
    let cachedBlock = (await this.cached.getCache(BLOCK_NUMBER)) ?? (await cntrct.provider.getBlockNumber());
    this.log(`Cached block ${cachedBlock}`);

    const fromBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('fromBlock')
        ? Number(simulate.logicOverride.fromBlock)
        : Number(cachedBlock);

    const toBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('toBlock')
        ? Number(simulate.logicOverride.toBlock)
        : await cntrct.provider.getBlockNumber();

    this.log('Helpers loaded');

    if (!(logicOverride && simulate.logicOverride.hasOwnProperty('toBlock'))) {
      this.cached.setCache(BLOCK_NUMBER, toBlock);
    }

    return {
      logicOverride: logicOverride,
      fromBlock: fromBlock,
      toBlock: toBlock,
      sdk: sdk,
      epns: sdks.epns,
      cntrct: cntrct,
    };
  }

  async getSdks() {
    this.log('getSdksHelper called');

    const sdk = await this.getSdk();
    const epns = sdk.advanced.getInteractableContracts(
      config.web3RopstenNetwork,
      defaultSdkSettings.networkSettings,
      this.walletKey,
      config.deployedContract,
      config.deployedContractABI,
    );
    return {
      sdk: sdk,
      epns: epns,
      walletKey: this.walletKey,
    };
  }

  // -----------
  // Showrunners
  // -----------
  async checkForExpiringARNFTs(simulate) {
    try {
      const helpers = await this.getHelpers(simulate);
      const sdk = helpers.sdk;
      let armor = helpers.cntrct;
      const users = simulate?.logicOverride?.users ?? (await sdk.getSubscribedUsers());

      for (const user of users) {
        // await this.checkAndSendExpiryNotifications('0xa3529eE60c841b10080A6Afa67db308768b1C54d', armor, simulate);
        await this.checkAndSendExpiryNotifications(user, armor, simulate);
      }
    } catch (error) {
      this.logError(error);
    }
  }

  // _________
  //
  // Fetchers
  // _________

  // Fetch recent removal requests in a given time period
  async checkAndSendExpiryNotifications(
    owner: string,
    armor: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    simulate,
  ) {
    try {
      this.log(`Fetching token balance of owner : ${owner}`);
      let balance = await armor.contract.balanceOf(owner);
      this.log(`Token Balance : ${balance}`);

      for (let i = 0; i < balance; i++) {
        this.log(`Fetching token at index ${i}`);
        let tokenIndex: BigNumber = await armor.contract.tokenOfOwnerByIndex(owner, i);
        this.log(`Token at index : -> `);
        let tokenInfo = await armor.contract.getToken(tokenIndex.toNumber());
        let token: ArNFT = {
          cid: tokenInfo[0],
          status: tokenInfo[1],
          sumAssured: tokenInfo[2],
          coverPeriod: tokenInfo[3],
          validUntil: tokenInfo[4],
          scAddress: tokenInfo[5],
          currencyCode: tokenInfo[6],
          premiumNXM: tokenInfo[7],
          coverPrice: tokenInfo[8],
          claimid: tokenInfo[9],
        };
        this.log(`Token expires at : `);
        this.log(tokenInfo[4].toString());
        if (Date.now() / 1000 > token.validUntil.sub(24 * 60 * 60).toNumber()) {
          this.logInfo('Token is about to expire');
          const title = 'arNFT expiration';
          const msg = `Your arNFT is about to expire`;
          const payloadMsg = `Your arNFT with Cover ID [d:${token.cid}] is about to expire soon.\n`;

          await this.sendNotification({
            image: null,
            recipient: owner,
            message: msg,
            notificationType: 3,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            title: title,
            cta: 'https://armor.fi/mint',
            simulate: simulate,
          });
        }
      }
    } catch (err) {
      this.logError(err);
      throw err;
    }
  }
}
