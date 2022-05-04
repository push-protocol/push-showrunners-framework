import { Contract, BigNumber, ethers } from 'ethers';
import { Inject } from 'typedi';
import { BaseProvider } from '@ethersproject/providers';
import moverSettings from './moverSettings.json';
import moverAssetPoolABI from './moverAssetPoolABI.json';
import abi from './mover.json';
import erc20Abi from './erc20.json';

import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { IMoverSchema, MoverModel } from './moverModel';
import { set } from 'mongoose';

const BLOCK_NUMBER = 'block_number';
export class MoverChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Mover',
      url: 'https://app.viamover.com/',
      useOffChain: true,
      address: '0xb754601d2C8C1389E6633b1449B84CcE57788566',
    });
  }

  get timestamp() {
    return Math.floor(Date.now() / 1000);
  }

  // -----------
  // Showrunners
  // -----------

  async checkForYieldDistributed(simulate) {
    try {
      this.logInfo('CheckForYieldDistibuted Event Begins');

      const sdk = await this.getSdk();

      let mover = await sdk.getContract(moverSettings.moverHolyRedeemerAddress, JSON.stringify(abi));
      const helpers = await this.getBlockNumbers(simulate, mover.contract, 1);
      let evts = await this.fetchYieldDistributedEvents(mover, helpers.fromBlock, helpers.toBlock);
      this.logInfo('Getting Subscribed Users');
      const subscribers = simulate?.logicOverride?.subscribers ?? (await sdk.getSubscribedUsers());
      this.logInfo(`Subscribed Users : %o`, subscribers);
      if (evts.eventCount == 0) this.log('NO Yield Distribution events found');
      else {
        for (const item of evts.log) {
          try {
            for (const user of subscribers) {
              try {
                let e = item.args;
                const title = 'Yield Distributed';
                const erc20 = await sdk.getContract(e[0], JSON.stringify(erc20Abi));
                const moverAssetPool = await sdk.getContract(
                  moverSettings.moverAssetPoolAddress,
                  JSON.stringify(moverAssetPoolABI),
                );

                const symbol = await erc20.contract.symbol();
                const decimals = await erc20.contract.decimals();
                const yieldAmount = e[1];

                const totalShares: BigNumber = await moverAssetPool.contract.totalShareAmount();
                const userShare: BigNumber = await moverAssetPool.contract.shares(user);

                const usersYieldAmount = userShare.mul(yieldAmount).div(totalShares);

                const usersYieldAmountRounded = (usersYieldAmount.toNumber() / Math.pow(10, decimals)).toFixed(3);

                this.logInfo(
                  `\nuser: ${user}\ntotalyieldAmount: ${yieldAmount}\ntotalShares: ${totalShares}\nuserShare:${userShare}\nusersYield: ${usersYieldAmount}\nusersYieldRounded : ${usersYieldAmountRounded}`,
                );

                const payloadMsg = `Your Yield amount of ${usersYieldAmountRounded} ${symbol} has been distributed. [timestamp:${this.timestamp}]`;
                const msg = `Yield has been distibuted for ${symbol}`;

                await this.sendNotification({
                  recipient: user,
                  image: null,
                  message: msg,
                  notificationType: 3,
                  payloadMsg: payloadMsg,
                  payloadTitle: title,
                  simulate: simulate,
                  title: title,
                });
              } catch (error) {
                this.logError(error);
              }
            }
          } catch (error) {
            this.logError(error);
          }
        }
      }
      await this.setMoverDataInDB({ yieldDistributedBlockNo: helpers.toBlock });
    } catch (error) {
      this.logError(error);
    }
  }

  // _________
  //
  // Fetchers
  // _________

  async fetchYieldDistributedEvents(
    mover: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    fromBlock,
    toBlock,
  ) {
    const filter = mover.contract.filters.YieldDistributed();
    try {
      this.log(`Fetching Yield Distributed events fromBlock : ${fromBlock} toBlock: ${toBlock}`);
      const events = await mover.contract.queryFilter(filter, fromBlock, toBlock);
      this.log('Events Fetched Successfully');
      this.cached.setCache(BLOCK_NUMBER, toBlock + 1);
      return {
        change: true,
        log: events,
        blockChecker: fromBlock,
        lastBlock: toBlock,
        eventCount: events.length,
      };
    } catch (err) {
      this.logError(err);
      return {
        success: false,
        err: 'Unable to obtain query filter, error : %o' + err,
      };
    }
  }

  async getBlockNumbers(simulate, contract: ethers.Contract, option: number) {
    this.logInfo(`Getting Block Numbers option: ${option}`);
    const moverData = await this.getMoverDataFromDB();
    const blockFromDB = moverData?.yieldDistributedBlockNo;

    let fromBlock = simulate?.logicOverride?.mode ? simulate?.logicOverride?.fromBlock : blockFromDB ?? 'latest';

    let toBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.toBlock
      : await contract.provider.getBlockNumber();

    const result = {
      fromBlock: fromBlock,
      toBlock: toBlock,
    };
    this.log(result);
    return result;
  }

  // Get Mover Data From DB
  async getMoverDataFromDB() {
    this.logInfo(`Getting Mover Data from DB..`);
    const doc = await MoverModel.findOne({ _id: 'MOVER_DATA' });
    this.logInfo(`Mover Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set Mover Data in DB
  async setMoverDataInDB(moverData: IMoverSchema) {
    this.logInfo(`Setting Mover Data In DB`);
    this.log(moverData);
    await MoverModel.findOneAndUpdate({ _id: 'MOVER_DATA' }, moverData, { upsert: true });
  }
}
