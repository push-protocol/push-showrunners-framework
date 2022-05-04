import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings } from '../../config';

import dydxSettings from './dydxSettings.json';
import dydxABI from './dydx.json';
import { request, gql } from 'graphql-request';

import { Contract } from '@ethersproject/contracts';
import { BaseProvider } from '@ethersproject/providers';
import 'ipfs-http-client';

import axios from 'axios';
import { Logger } from 'winston';
import { EPNSChannel, ISendNotificationParams } from '../../helpers/epnschannel';
import { ethers } from 'ethers';
import { DYDXModel, IdydxData } from './dydxModel';

export interface ISnapshotProposal {
  id: string;
  title: string;
  body: string;
  created: number;
  choices: string[];
  start: number;
  state: string;
  end: number;
}

enum Tasks {
  ProposalCreated,
  ProposalQueued,
  ProposalExecuted,
}
@Service()
export default class DYDXChannel extends EPNSChannel {
  URL_SPACE_PROPOSAL = 'https://hub.snapshot.org/graphql';
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') private cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'dYdX Governance',
      url: 'https://dydx.community/',
      useOffChain: true,
      address: '0x23c6b8fB0557FD5e6696BceF3fD4855E0d7018C0',
    });
  }

  async getBlockNumbers(simulate, contract: ethers.Contract, option: Tasks) {
    this.logInfo(`Getting Block Numbers option: ${option}`);
    const dydxData = await this.getDydxDataFromDB();
    let blockFromDB;

    switch (option) {
      case Tasks.ProposalCreated:
        this.logInfo(`Block No Mode : ${Tasks.ProposalCreated}`);
        blockFromDB = dydxData?.proposalCreatedBlockNo;
        break;
      case Tasks.ProposalExecuted:
        this.logInfo(`Block No Mode : ${Tasks.ProposalExecuted}`);
        blockFromDB = dydxData?.proposalExecutedBlockNo;
        break;
      case Tasks.ProposalQueued:
        this.logInfo(`Block No Mode : ${Tasks.ProposalQueued}`);
        blockFromDB = dydxData?.proposalQueuedBlockNo;
        break;
      default:
        break;
    }

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

  async prepareAndSendNotification(details: ISendNotificationParams) {
    this.logInfo(`Notification Type : ${details.notificationType}`);
    this.log(details.notificationType);
    await this.sendNotification({
      recipient: details.recipient,
      image: null,
      message: details.message,
      payloadMsg: details.payloadMsg,
      title: details.title,
      payloadTitle: details.title,
      cta: details.cta,
      notificationType: details.notificationType,
      simulate: details.cta,
    });
  }

  //
  // Showrunners
  //

  async proposalCreatedTask(simulate) {
    try {
      const sdk = await this.getSdk();
      const dydx = await sdk.getContract(dydxSettings.governorContractAddress, JSON.stringify(dydxABI));
      const blockNos = await this.getBlockNumbers(simulate, dydx.contract, Tasks.ProposalCreated);
      const filter = dydx.contract.filters.ProposalCreated();
      const evts = await this.fetchEvents(filter, dydx, blockNos.fromBlock, blockNos.toBlock);

      for (let i = 0; i < evts.eventCount; i++) {
        try {
          const proposal = evts.logs[i].args;
          // 0 -> ID
          // 1 -> Creator
          // 11 -> ipfsHash
          this.log(proposal[11]);
          const p = {
            id: proposal[0],
            creator: proposal[1],
            ipfsHash: this.getIPFSHash(proposal[11]),
          };

          this.log(`ID: ${proposal[0]}, Creator: ${proposal[1]}, ipfsHash: ${p.ipfsHash}`);
          const d = await this.getIPFSPayload(p.ipfsHash);
          this.log(`Got Proposal Details`);
          this.log(d);

          const title = 'New Proposal';
          const payloadMsg = `DIP : ${d.DIP}\n[b:${d.title}]\n${d['shortDescription']}\n[timestamp:${Date.now() /
            1000}]`;
          const msg = `New Proposal has been proposed ${d.title}`;

          await this.prepareAndSendNotification({
            recipient: this.channelAddress,
            title: title,
            message: msg,
            cta: `https://dydx.community/dashboard/proposal/${proposal[0].toString()}`,
            image: null,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            notificationType: 1,
            simulate: simulate,
          });
        } catch (error) {
          this.logError(error);
        }
      }
      await this.setDydxDataInDB({ proposalCreatedBlockNo: blockNos.toBlock });
    } catch (error) {
      this.logger.error(error);
      this.logError(error);
    }
  }

  async proposalQueuedTask(simulate) {
    try {
      const sdk = await this.getSdk();
      const dydx = await sdk.getContract(dydxSettings.governorContractAddress, JSON.stringify(dydxABI));
      const blockNos = await this.getBlockNumbers(simulate, dydx.contract, Tasks.ProposalQueued);
      const filter = dydx.contract.filters.ProposalQueued();
      const evts = await this.fetchEvents(filter, dydx, blockNos.fromBlock, blockNos.toBlock);
      if (simulate?.logicOverride?.force) {
        evts.eventCount = 1;
      }
      for (let i = 0; i < evts.eventCount; i++) {
        try {
          const proposal = simulate?.logicOverride?.force ? [0] : evts.logs[i].args;
          // 0 -> ID
          // 1 -> Creator
          // 11 -> ipfsHash
          this.log(proposal[11]);
          const ipfsHash = (await dydx.contract.getProposalById(proposal[0])).ipfsHash;
          const p = {
            id: proposal[0],
            executionTime: proposal[1],
            ipfsHash: this.getIPFSHash(ipfsHash),
          };

          this.log(`ID: ${proposal[0]}, ipfsHash: ${p.ipfsHash}`);
          const d = await this.getIPFSPayload(p.ipfsHash);
          this.log(`Got Proposal Details`);
          this.log(d);

          const title = 'Proposal Queued';

          const msg = `The Proposal "${d.title}" has been queued`;
          const payloadMsg =
            `The Proposal DIP #${d.DIP} has been queued\n[b:${d.title}]` +
            `\n${d['short description']}[timestamp:${Date.now() / 1000}]`;

          await this.prepareAndSendNotification({
            recipient: this.channelAddress,
            title: title,
            message: msg,
            cta: `https://dydx.community/dashboard/proposal/${proposal[0].toString()}`,
            image: null,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            notificationType: 1,
            simulate: simulate,
          });
        } catch (error) {
          this.logError(error);
        }
      }

      await this.setDydxDataInDB({ proposalQueuedBlockNo: blockNos.toBlock });
    } catch (error) {
      this.logError(error);
    }
  }

  async snapShotProposalsTask(simulate) {
    try {
      const dydxData = await this.getDydxDataFromDB();
      if (!dydxData?.snapshotProposalLatestTimestamp)
        this.logInfo(`snapshotProposalLatestTimestamp from DB does not exist`);
      const resp: { proposals: ISnapshotProposal[] } = await this.fetchSnapshotProposals(
        dydxData?.snapshotProposalLatestTimestamp ?? (Date.now() / 1000).toFixed(),
      );
      for (const proposal of resp.proposals) {
        try {
          this.log('-------------------------');
          this.log(`title: ${proposal.title}\nid : ${proposal.id}\nmsg: ${proposal.body}`);

          const payloadMsg = `A Proposal has been created on dYdX\n[b:${proposal.title}][timestamp:${Date.now() /
            1000}]`;
          const message = `A Proposal "${proposal.title}" has been created on dYdX`;
          const title = 'New Proposal';
          const cta = `https://snapshot.org/#/dydxgov.eth/proposal/${proposal.id}`;
          await this.prepareAndSendNotification({
            recipient: this.channelAddress,
            message: message,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            title: title,
            image: null,
            notificationType: 1,
            simulate: simulate,
            cta: cta,
          });
        } catch (error) {
          this.logError(error);
        }
      }
      await this.setDydxDataInDB({ snapshotProposalLatestTimestamp: parseInt((Date.now() / 1000).toFixed()) });
    } catch (error) {
      this.logError(error);
    }
  }

  async proposalExecutedTask(simulate) {
    try {
      const sdk = await this.getSdk();
      const dydx = await sdk.getContract(dydxSettings.governorContractAddress, JSON.stringify(dydxABI));
      const blockNos = await this.getBlockNumbers(simulate, dydx.contract, Tasks.ProposalExecuted);
      const filter = dydx.contract.filters.ProposalExecuted();
      const evts = await this.fetchEvents(filter, dydx, blockNos.fromBlock, blockNos.toBlock);

      if (simulate?.logicOverride?.force) {
        evts.eventCount = 1;
      }
      for (let i = 0; i < evts.eventCount; i++) {
        try {
          const proposal = simulate?.logicOverride?.force ? [0] : evts.logs[i].args;

          const ipfsHash = (await dydx.contract.getProposalById(proposal[0])).ipfsHash;

          const p = {
            id: proposal[0],

            ipfsHash: this.getIPFSHash(ipfsHash),
          };

          this.log(`ID: ${proposal[0]}, ipfsHash: ${p.ipfsHash}`);
          const d = await this.getIPFSPayload(p.ipfsHash);
          this.log(`Got Proposal Details`);
          this.log(d);

          const title = 'Proposal Executed';
          const msg = `The Proposal DIP #${d.DIP} - ${d.title} has been executed`;
          const payloadMsg = `The Proposal DIP #${d.DIP} - [b:${d.title}] has been executed`;
          await this.prepareAndSendNotification({
            recipient: this.channelAddress,
            title: title,
            message: msg,
            cta: `https://dydx.community/dashboard/proposal/${proposal[0].toString()}`,
            image: null,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            notificationType: 1,
            simulate: simulate,
          });
        } catch (error) {
          this.logError(error);
        }
      }
      await this.setDydxDataInDB({ proposalExecutedBlockNo: blockNos.toBlock });
    } catch (error) {
      this.logError(error);
    }
  }

  getIPFSHash(ipfsHashBytes) {
    this.logInfo(`getIPFSHash Called with ${ipfsHashBytes}`);
    return ethers.utils.base58.encode(Buffer.from(`1220${ipfsHashBytes.slice(2)}`, 'hex'));
  }

  async getIPFSPayload(hash) {
    this.logInfo(`Getting IPFS payload for hash ${hash}`);
    const resp = await axios.get(`http://ipfs.io/ipfs/${hash}`);

    return resp.data;
  }

  async fetchEvents(
    filter: any,
    contract: {
      provider: BaseProvider;
      contract: Contract;
      signingContract: Contract;
    },
    fromBlock,
    toBlock,
  ) {
    try {
      this.log(`Fetching events from ${fromBlock} to ${toBlock}`);
      const events = await contract.contract.queryFilter(filter, fromBlock, toBlock);

      this.log(`Events Fetched Successfully eventCount:${events.length}`);

      return {
        change: true,
        logs: events,
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

  async fetchSnapshotProposals(created_gte): Promise<any> {
    this.logInfo('Fetching Snapshot Proposals');
    const snapshotQuery = gql`
    {
      proposals(orderBy: "start", orderDirection: desc, where: {space_in: ["dydxgov.eth"],created_gte:${created_gte}}) {
        id
        title
        body
        created
        state
        choices
        start
        end
      }
    }
    `;

    const resp = await request(this.URL_SPACE_PROPOSAL, snapshotQuery);

    return resp;
  }

  // Get Dydx Data From DB
  async getDydxDataFromDB() {
    this.logInfo(`Getting DyDx Data from DB..`);
    const doc = await DYDXModel.findOne({ _id: 'DYDX_DATA' });
    this.logInfo(`DyDx Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set DyDx Data in DB
  async setDydxDataInDB(dydxData: IdydxData) {
    this.logInfo(`Setting DYDX Data In DB`);
    this.log(dydxData);
    await DYDXModel.findOneAndUpdate({ _id: 'DYDX_DATA' }, dydxData, { upsert: true });
  }
}
