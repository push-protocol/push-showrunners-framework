// @name: MakerDao Channel
// @version: 1.0
// @recent_changes: Intial implementation

import { Service, Inject, Container } from 'typedi';
import config, { defaultSdkSettings } from '../../config';

import makerduxSettings from './makerduxSettings.json';
import moment from 'moment';
import axios from 'axios';
import { Logger } from 'winston';
import { EPNSChannel } from '../../helpers/epnschannel';

// SET CONSTANTS
const BLOCK_NUMBER = 'block_number';

const NOTIFICATION_TYPE = Object.freeze({
  NEW: 'new_poll',
  START: 'poll_started',
  END: 'poll_ended',
  NEW_EXECUTIVE: 'new_executive_poll',
});

//contract ABIs
const contractABI = {
  poolingContractDeployedABI: require('./poolingDeployedContractABI.json'),
  batchPoolingContractDeployedABI: require('./batchPoolingContractABI.json'),
  executivePoolingContractDeployedABI: require('./executivePoolingDeployedContractABI.json'),
};

@Service()
export default class makerduxChannel extends EPNSChannel {
  PollModel;
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'MakerDUX',
      url: 'https://vote.makerdao.com/',
      useOffChain: true,
      address:'0x8Cd0ad5C55498Aacb72b6689E1da5A284C69c0C7'
    });
    //initializing cache
    this.cached.setCache(BLOCK_NUMBER, 0);
  }

  public async sendMessageToContract(simulate) {
    const cache = this.cached;
    // Overide logic of need be
    const logicOverride =
      typeof simulate == 'object'
        ? simulate.hasOwnProperty('logicOverride') && simulate.logicOverride.mode
          ? simulate.logicOverride.mode
          : false
        : false;
    // -- End Override logic

    this.logInfo(`Checking for new polls...`);

    const sdk = await this.getSdk();

    // Initialize block if that is missing
    let cachedBlock = await cache.getCache(BLOCK_NUMBER);
    this.logInfo('[Maker] Cached block number for Poll, Batched Poll and Executive Poll %o', cachedBlock);

    //Contract Initialisation
    const pollContract = await sdk.getContract(
      makerduxSettings.poolingDeployedContract,
      contractABI.poolingContractDeployedABI,
    );
    const batchPollContract = await sdk.getContract(
      makerduxSettings.batchPoolingDeployedContract,
      contractABI.batchPoolingContractDeployedABI,
    );
    const executivePollContract = await sdk.getContract(
      makerduxSettings.executivePoolingDeployedContract,
      contractABI.executivePoolingContractDeployedABI,
    );

    if (!cachedBlock) {
      cachedBlock = 0;
      this.logInfo(
        ` Initialized flag was not set, first time initalzing, saving latest block of blockchain where everest contract is...`,
      );
      await pollContract.provider
        .getBlockNumber()
        .then(blockNumber => {
          this.logInfo(`Current block number is... %s`, blockNumber);
          cache.setCache(BLOCK_NUMBER, blockNumber);
          this.logInfo('Initialized Block Number: %s', blockNumber);
        })
        .catch(err => {
          this.logInfo(`Error occurred while getting Block Number: %o`, err);
        });
    }

    // Overide logic for blocks need be
    const fromBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('fromBlock')
        ? Number(simulate.logicOverride.fromBlock)
        : Number(cachedBlock);
    const toBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('toBlock')
        ? Number(simulate.logicOverride.toBlock)
        : 'latest';
    // -- End Override logic

    // for poll contract
    this.logInfo('Checking poll contract');
    const pollDetail: any = await this.getNewPool(pollContract, fromBlock, toBlock);
    cache.setCache(BLOCK_NUMBER, pollDetail.lastBlock);
    await this.checkPollAndSendNotification(pollDetail, sdk, this.walletKey, simulate);

    this.logInfo('Checking batch poll contract');
    //for batch pool contract
    const batchPollDetail: any = await this.getNewPool(batchPollContract, fromBlock, toBlock);
    await this.checkPollAndSendNotification(batchPollDetail, sdk, this.walletKey, simulate);

    //for executive proposal
    const executivePollDetail: any = await this.getExectivePoll(executivePollContract, fromBlock, toBlock, simulate);
    // this.log(executivePollContract)
    if (executivePollDetail.eventCount == 0) this.logInfo(`No new executive proposal`);
    else {
      await this.sendBroadcastNotification({}, sdk, NOTIFICATION_TYPE.NEW_EXECUTIVE, simulate);
    }
  }

  public async checkPollAndSendNotification(pollDetail, sdk, walletKey, simulate) {
    this.PollModel = Container.get('makerduxModel');
    if (!sdk) {
      const sdk = await this.getSdk();
    }
    //Check if there are events else return
    if (pollDetail.eventCount == 0) {
      this.logInfo('No new Proposal...');
    }

    for (let i = 0; i < pollDetail.eventCount; i++) {
      //Save poll to DB
      this.logInfo(`PollDetail %o`, pollDetail);
      //   this.log(pollDetail.log[i]);

      const startDate = Number(pollDetail.log[i].args.startDate);
      const endDate = Number(pollDetail.log[i].args.endDate);
      const creator = pollDetail.log[i].args.creator;
      this.logInfo('===================================');
      this.logInfo(pollDetail.log[i].args.url);
      this.logInfo('===================================');
      const data = await axios.get(pollDetail.log[i].args.url);
      const multiHash = pollDetail.log[i].args.multiHash;
      const id = multiHash.slice(0, 8);

      const titleRegex = /title:(.*)/;
      // const discussionRegex = /discussion_link:(.*)
      const summaryRegex = /summary:(.*)/;
      // let url = (data.data.match(discussionRegex)[1]).trim()
      const title = data.data.match(titleRegex)[1].trim();
      const summary = data.data.match(summaryRegex)[1];
      let url = `https://vote.makerdao.com/polling/${id}?network=mainnet#poll-detail`;

      try {
        await this.PollModel.updateOne(
          { title, startDate, endDate, url },
          { $set: { title, startDate, endDate, url } },
          { upsert: true },
        );
        this.log('Saved to db');
        // this.log(poll)
      } catch (error) {
        this.logError(`Error During DB Update`);
        this.logError(error);
      }

      //Send notification for new proposal
      const pollData = {
        title,
        summary,
        url,
        creator,
        startDate,
        endDate,
      };
      this.log('175');
      this.log(pollData);
      await this.sendBroadcastNotification(pollData, sdk, NOTIFICATION_TYPE.NEW, simulate);
    }
  }

  public async getNewPool(contract, fromBlock, toBlock) {
    const logger = this.logger;

    this.logInfo(`fromBlock : ${fromBlock}, toBlock: ${toBlock}`);
    // logger.log(`[${new Date(Date.now())}]-[Maker]- Fetching new poll`);

    let result = new Promise(async (resolve, reject) => {
      // this.log(await contract)
      const filter = (await contract).contract.filters.PollCreated();
      logger.debug(`[${new Date(Date.now())}]-[Maker]- Looking for PollCreated() from %d to %s`, fromBlock, toBlock);

      (await contract).contract
        .queryFilter(filter, fromBlock, toBlock)
        .then(async eventLog => {
          logger.info(`[${new Date(Date.now())}]-[Maker]- PollCreated() --> %o`);

          // Get the latest block
          try {
            toBlock = await (await contract).provider.getBlockNumber();
            logger.debug(`[${new Date(Date.now())}]-[Maker]- Latest block updated to --> %s`, toBlock);
          } catch (err) {
            logger.debug(`[${new Date(Date.now())}]-[Maker]- !Errored out while fetching Block Number --> %o`, err);
          }

          const info = {
            change: true,
            log: eventLog,
            blockChecker: fromBlock,
            lastBlock: toBlock,
            eventCount: eventLog.length,
          };

          resolve(info);

          this.logInfo(`Events retreived for PollCreated() call of Maker Contract --> %d Events`, eventLog.length);
        })
        .catch(err => {
          this.logInfo(`Unable to obtain query filter, error: %o`, err);

          resolve({
            success: false,
            err: 'Unable to obtain query filter, error: %o' + err,
          });
        });
    });

    return await result;
  }

  public async getExectivePoll(contract, fromBlock, toBlock, simulate) {
    const logger = this.logger;
    const cache = this.cached;

    const sdk = await this.getSdk();
    this.logInfo('Maker from and to block', fromBlock, toBlock);
    // logger.log(`[${new Date(Date.now())}]-[Maker]- Fetching new poll`);

    let result = new Promise(async (resolve, reject) => {
      // this.log(await contract)
      const filter = (await contract).contract.filters.Etch();
      logger.debug(`[${new Date(Date.now())}]-[Maker]- Looking for Etch() from %d to %s`, fromBlock, toBlock);

      (await contract).contract
        .queryFilter(filter, fromBlock, toBlock)
        .then(async eventLog => {
          logger.info(`[${new Date(Date.now())}]-[Maker]- Etch() --> %o`);

          // Get the latest block
          try {
            toBlock = await (await contract).provider.getBlockNumber();
            logger.debug(`[${new Date(Date.now())}]-[Maker]- Latest block updated to --> %s`, toBlock);
          } catch (err) {
            logger.debug(`[${new Date(Date.now())}]-[Maker]- !Errored out while fetching Block Number --> %o`, err);
          }

          const info = {
            change: true,
            log: eventLog,
            blockChecker: fromBlock,
            lastBlock: toBlock,
            eventCount: eventLog.length,
          };

          resolve(info);

          logger.debug(
            `[${new Date(
              Date.now(),
            )}]-[Maker]- Events retreived for ProposalCreated() call of Maker Contract --> %d Events`,
            eventLog.length,
          );
        })
        .catch(err => {
          logger.debug(`[${new Date(Date.now())}]-[Maker]- Unable to obtain query filter, error: %o`, err);

          resolve({
            success: false,
            err: 'Unable to obtain query filter, error: %o' + err,
          });
        });
    });

    return await result;
  }

  public async checkStartDateAndNotify(simulate) {
    const sdk = await this.getSdk();
    this.PollModel = Container.get('makerduxModel');
    try {
      //find poll qith startdate greater than currrent time and less than 3hr before
      let pollData = await this.PollModel.find({
        $and: [
          { startDate: { $gte: 13168359 } },
          // { startDate: { $lte: Math.floor((Date.now() / 1000) - 10800) } }
        ],
      }).lean();
      this.log(pollData);

      for (let i = 0; i < pollData.length; i++) {
        this.log(pollData[i]);
        await this.sendBroadcastNotification(pollData[i], sdk, NOTIFICATION_TYPE.START, simulate);
      }
    } catch (error) {
      this.logInfo(`[${new Date(Date.now())}]-[Maker]- Error while fetching DB info`, error);
    }
  }

  public async checkEndDateAndNotify(simulate) {
    const sdk = await this.getSdk();
    this.PollModel = Container.get('makerduxModel');
    try {
      //find poll qith startdate greater than currrent time and less than 3hr before
      let pollData = await this.PollModel.find({
        $and: [
          { endDate: { $gte: 13168359 } },
          // { startDate: { $lte: Math.floor((Date.now() / 1000) - 10800) } }
        ],
      }).lean();
      this.log(pollData);

      for (let i = 0; i < pollData.length; i++) {
        await this.sendBroadcastNotification(pollData[i], sdk, NOTIFICATION_TYPE.END, simulate);
      }
    } catch (error) {
      this.logInfo(`[${new Date(Date.now())}]-[Maker]- Error while fetching DB info`, error);
    }
  }

  public async sendBroadcastNotification(pollData, sdk, notificationType, simulate) {
    let title, message, payloadTitle, payloadMsg, notifType, cta;
    if (!sdk) {
      const sdk = await this.getSdk();
    }

    switch (notificationType) {
      case NOTIFICATION_TYPE.NEW:
        this.logInfo(`[${new Date(Date.now())}]-[Maker]- Sending notification for ${pollData.title}`);
        title = `New Poll is live`;
        message = `New Poll posted by ${pollData.creator}`;
        payloadTitle = pollData.title;
        payloadMsg = `[d:Summary]: ${pollData.summary}.\n\n[s:Start Date]: ${moment(pollData.startDate * 1000).format(
          'MMMM Do YYYY',
        )}\n\n[t:End Date]: ${moment(pollData.endDate * 1000).format('MMMM Do YYYY')} [timestamp: ${Math.floor(
          Date.now() / 1000,
        )}]`;
        notifType = 3;
        cta = pollData.url;
        break;

      case NOTIFICATION_TYPE.START:
        this.logInfo(`[${new Date(Date.now())}]-[Maker]- Sending notification for ${pollData.title}`);
        title = `Voting on Poll Started`;
        message = `Voting started on ${pollData.title} `;
        payloadTitle = `Voting started!`;
        payloadMsg = `Voting on started on [d:${pollData.title}] [timestamp: ${Math.floor(Date.now() / 1000)}]`;
        notifType = 3;
        cta = pollData.url;
        break;

      case NOTIFICATION_TYPE.END:
        this.logInfo(`[${new Date(Date.now())}]-[Maker]- Sending notification for ${pollData.title}`);
        title = `Voting on Poll Ended`;
        message = `Voting Ended on ${pollData.title} `;
        payloadTitle = `Voting ended!`;
        payloadMsg = `Voting on ended on [t:${pollData.title}] [timestamp: ${Math.floor(Date.now() / 1000)}]`;
        notifType = 3;
        cta = pollData.url;
        break;

      case NOTIFICATION_TYPE.NEW_EXECUTIVE:
        this.logInfo(`[${new Date(Date.now())}]-[Maker]- Sending notification for executive type`);
        title = `New Executive Poll`;
        message = `New Executive Poll is live`;
        payloadTitle = `New Executive Poll`;
        payloadMsg = `[s:New Executive Poll] is live [timestamp: ${Math.floor(Date.now() / 1000)}]`;
        notifType = 3;
        cta = 'https://vote.makerdao.com/executive?network=mainnet';
        break;
      default:
        this.logInfo('Incorrect type');
    }

    await this.sendNotification({
      recipient: this.channelAddress,
      image: null,
      message: message,
      title: title,
      payloadTitle: payloadTitle,
      payloadMsg: payloadMsg,
      notificationType: notifType,
      simulate: simulate,
      cta: cta,
    });
  }
}
