import { Contract, ethers } from 'ethers';
import { Inject } from 'typedi';
import { BaseProvider } from '@ethersproject/providers';
import idleGovSettings from './idleGovernanceSettings.json';
import abi from './idleGovernance.json';
import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { IdleModel, IIdleSchema } from './idleModel';

interface PayloadDetails {
  recipientAddr: any;
  payloadType: any;
  title: any;
  body: any;
  payloadTitle: any;
  payloadMsg: any;
  payloadCTA: any;
  payloadImg: any;
  notificationType: any;
}

const BLOCK_NUMBER = 'block_number';
export class IdleGovernanceChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Idle Governance',
      url: 'https://idle.finance',
      useOffChain: true,
      address: '0xFb3bD022D5DAcF95eE28a6B07825D4Ff9C5b3814',
    });
  }




  async prepareAndSendNotification(simulate, details: PayloadDetails) {
    await this.sendNotification({
      recipient: details.recipientAddr,
      notificationType: details.notificationType,
      title: details.payloadTitle,
      message: details.body,
      image: null,
      payloadMsg: details.payloadMsg,
      payloadTitle: details.payloadTitle,
      simulate: simulate,
      cta: details.payloadCTA,
    });
  }

  // -----------
  // Showrunners
  // -----------

  async checkForNewGovernanceProposals(simulate) {
    try {
      this.log('IDLE Governance Task');
      // const helpers = await this.getHelpers(simulate);
      const sdk = await this.getSdk();

      let idleGov = await sdk.getContract(idleGovSettings.idleGovernanceDeployedContract, JSON.stringify(abi));
      let blockNos = await this.getBlockNumbers(simulate, idleGov.contract, 1);
      let evts = await this.fetchRecentGovernanceProposals(idleGov, blockNos.fromBlock, blockNos.toBlock);
      await this.setIdleDataInDB({ proposalCreatedBlockNo: blockNos.toBlock });
      if (evts.eventCount == 0) this.log('NO Proposals Found');
      else {
        for (const item of evts.log) {
          try {
            let e = item.args;

            this.log(`Sending notification for Proposal ID: ${e[0]}`);
            this.log(`${e[8]}`);
            const title = 'New Proposal';
            // const msg = `${e[1]} Just proposed ${e[8]}`;
            const msg = `New Proposal On Idle Finance`;
            const payloadMsg = `[d:Proposer] : ${e[1]}\n\n[d:Proposal] : ${
              e[8].split('https://')[0]
            }\n[timestamp:${Date.now() / 1000}]`;
            const cta = `https://idle.finance/#/governance/proposals`;
            await this.prepareAndSendNotification(simulate, {
              recipientAddr: this.channelAddress,
              payloadType: 3,
              title: title,
              body: msg,
              payloadCTA: cta,
              payloadImg: null,
              payloadMsg: payloadMsg,
              payloadTitle: title,
              notificationType: simulate?.txOverride ?? 1,
            });
          } catch (error) {
            this.logError(error);
          }
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  // _________
  //
  // Fetchers
  // _________

  async fetchRecentGovernanceProposals(
    idleGov: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    fromBlock,
    toBlock,
  ) {
    const filter = idleGov.contract.filters.ProposalCreated();
    try {
      this.log(`Fetching Recent Proposals fromBlock : ${fromBlock} toBlock: ${toBlock}`);
      const events = await idleGov.contract.queryFilter(filter, fromBlock, toBlock);
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
    const idleData = await this.getIdleDataFromDB();
    const blockFromDB = idleData?.proposalCreatedBlockNo;

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
  // Get Idle Data From DB
  async getIdleDataFromDB() {
    this.logInfo(`Getting Idle Data from DB..`);
    const doc = await IdleModel.findOne({ _id: 'IDLE_DATA' });
    this.logInfo(`Idle Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set Idle Data in DB
  async setIdleDataInDB(idleData: IIdleSchema) {
    this.logInfo(`Setting Idle Data In DB`);
    this.log(idleData);
    await IdleModel.findOneAndUpdate({ _id: 'IDLE_DATA' }, idleData, { upsert: true });
  }
}
