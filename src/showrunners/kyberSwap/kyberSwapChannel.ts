import { Contract, ethers } from 'ethers';
import { Inject } from 'typedi';
import { BaseProvider } from '@ethersproject/providers';
import settingsData from './kyberSwapSettings.json';
import kyberGovernanceABI from './KyberGovernanceABI.json';
import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import * as matter from 'gray-matter';
import axios from 'axios';
import { IKyberSchema, KyberModel } from './kyberSwapModel';

export class KyberSwapChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Kyber Swap',
      url: 'https://kyberswap.com/',
      useOffChain: true,
      address: '0x91c9D4373B077eF8082F468C7c97f2c499e36F5b',
    });
  }

  // -----------
  // Showrunners
  // -----------

  async checkForNewProposals(simulate) {
    try {
      const sdk = await this.getSdk();

      let kyberGov = await sdk.getContract(settingsData.addresses.kyberGovernance, JSON.stringify(kyberGovernanceABI));
      const helpers = await this.getBlockNumbers(simulate, kyberGov.contract, 1);
      let evts = await this.fetchRecentGenericProposals(kyberGov, helpers.fromBlock, helpers.toBlock);
      if (evts.eventCount == 0) this.log('NO Proposals Found');
      else {
        for (const item of evts.log) {
          try {
            const details = await this.getKIPDetails(item.args[7]);
            const title = `New Proposal`;
            const msg = `A New KIP is created`;
            const payloadMsg = `Title : ${details.title}\nKIP : #${details.kip}\nType : ${details.type}`;
            const cta = `https://kyber.org/proposal/${details.kip - 8}`;
            this.logInfo(`cta : ${cta}`);
            await this.sendNotification({
              recipient: this.channelAddress,
              image: null,
              message: msg,
              payloadMsg: payloadMsg,
              notificationType: 1,
              payloadTitle: title,
              simulate: simulate,
              title: title,
              cta: cta,
            });
          } catch (error) {
            this.logError(error);
          }
        }
      }
      await this.setKyberDataInDB({ newProposalBlockNo: helpers.toBlock });
    } catch (error) {
      this.logError(error);
    }
  }

  // -----------
  // Showrunners
  // -----------

  async checkForNewBinaryProposals(simulate) {
    try {
      const sdk = await this.getSdk();

      let kyberGov = await sdk.getContract(settingsData.addresses.kyberGovernance, JSON.stringify(kyberGovernanceABI));
      const helpers = await this.getBlockNumbers(simulate, kyberGov.contract, 2);

      let evts = await this.fetchRecentBinaryProposals(kyberGov, helpers.fromBlock, helpers.toBlock);
      if (evts.eventCount == 0) this.log('NO Proposals Found');
      else {
        for (const item of evts.log) {
          try {
            let e = item.args;

            const title = 'New Proposal';
            // const msg = `${e[1]} Just proposed ${e[8]}`;

            const msg = `[d:Proposer] : ${e[1]}\n\n[d:Proposal] : ${e[8].split('https://')[0]}\n`;
            console.log(msg);
            console.log(`https://${e[8].split('https://')[1]}`);

            await this.sendNotification({
              recipient: this.channelAddress,
              image: null,
              message: msg,
              notificationType: 1,
              payloadMsg: msg,
              payloadTitle: title,
              simulate: simulate,
              title: title,
              cta: `https://${e[8].split('https://')[1]}`,
            });
          } catch (error) {
            this.logError(error);
          }
        }
      }
      await this.setKyberDataInDB({ newBinaryProposalBlockNo: helpers.toBlock });
    } catch (error) {
      this.logError(error);
    }
  }

  // _________
  //
  // Fetchers
  // _________

  // Fetch recent removal requests in a given time period
  async fetchRecentBinaryProposals(
    kyberGov: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    fromBlock,
    toBlock,
  ) {
    const filter = kyberGov.contract.filters.BinaryProposalCreated();
    try {
      this.log(`Fetching Recent Removal Requests fromBlock : ${fromBlock} toBlock: ${toBlock}`);
      const events = await kyberGov.contract.queryFilter(filter, fromBlock, toBlock);
      this.log('Events Fetched Successfully');

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

  // Fetch recent removal requests in a given time period
  async fetchRecentGenericProposals(
    kyberGov: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    fromBlock,
    toBlock,
  ) {
    const filter = kyberGov.contract.filters.GenericProposalCreated();
    try {
      this.log(`Fetching Recent Removal Requests fromBlock : ${fromBlock} toBlock: ${toBlock}`);
      const events = await kyberGov.contract.queryFilter(filter, fromBlock, toBlock);
      this.log('Events Fetched Successfully');

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

  async getKIPDetails(purl: string): Promise<{ kip: number; title: string; type: string; authors: string }> {
    let url = purl.replace('github.com', 'raw.githubusercontent.com').replace('blob/', '');
    this.log(`Fetching KIP details ${url}`);
    const resp = await axios.get(url);
    const data = resp.data;
    const fm: any = matter.default(data);
    this.log('Fetching KIP details finished');
    return fm.data;
  }

  async getBlockNumbers(simulate, contract: ethers.Contract, option: number) {
    this.logInfo(`Getting Block Numbers option: ${option}`);
    const kyberData = await this.getKyberDataFromDB();
    const blockFromDB = option == 1 ? kyberData?.newProposalBlockNo : kyberData?.newBinaryProposalBlockNo;

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

  // Get Kyber Data From DB
  async getKyberDataFromDB() {
    this.logInfo(`Getting Kyber Data from DB..`);
    const doc = await KyberModel.findOne({ _id: 'KYBER_DATA' });
    this.logInfo(`Kyber Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set Kyber Data in DB
  async setKyberDataInDB(kyberData: IKyberSchema) {
    this.logInfo(`Setting Kyber Data In DB`);
    this.log(kyberData);
    await KyberModel.findOneAndUpdate({ _id: 'KYBER_DATA' }, kyberData, { upsert: true });
  }
}
