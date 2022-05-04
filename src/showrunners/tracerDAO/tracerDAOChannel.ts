/* eslint-disable prettier/prettier */
import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings } from '../../config';
import { request, gql } from 'graphql-request';
import { Logger } from 'winston';
import { EPNSChannel, ISendNotificationParams } from '../../helpers/epnschannel';
import { tracerDAOModel, ItracerDAOData } from './tracerDAOModel';

export interface ISnapshotProposal {
  percent: any;
  result: any;
  scores_total: number;
  scores: any;
  id: string;
  title: string;
  body: string;
  created: number;
  choices: string[];
  start: number;
  state: string;
  end: number;
}

@Service()
export default class MStableChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'tracerDAO',
      url: 'https://tracer.finance/',
      useOffChain: true,
      address:'0x8bf25240402C126bb236d26D391b782c5c893D32'
    });
  }
  URL_SPACE_PROPOSAL = 'https://hub.snapshot.org/graphql';

  //
  // Showrunners
  //

  async snapShotProposalsTask(simulate) {
    try {
      const tracerDAOData = await this.gettracerDAODataFromDB();
      if (!tracerDAOData?.snapshotProposalLatestTimestamp)
        this.logInfo(`snapshotProposalLatestTimestamp from DB does not exist`);
      const res: { proposals: ISnapshotProposal[] } = await this.fetchSnapshotProposals(
        tracerDAOData?.snapshotProposalLatestTimestamp ?? this.timestamp,
      );

      this.logInfo(`No of proposals : ${res.proposals.length}`);
      for (const proposal of res.proposals) {
        try {
          this.log('-------------------------');
          this.log(`title: ${proposal.title}\nid : ${proposal.id}\nmsg: ${proposal.body}`);

          const payloadMsg = `A Proposal has been created on tracerDAO\n[b:${proposal.title}][timestamp:${Date.now() /
            1000}]`;
          const message = `A Proposal "${proposal.title}" has been created on tracerDAO`;
          const title = 'New Proposal';
          const cta = `https://snapshot.org/#/tracer.eth/proposal/${proposal.id}`;
          await this.sendNotification({
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
      await this.settracerDAODataInDB({ snapshotProposalLatestTimestamp: this.timestamp });
    } catch (error) {
      this.logError(error);
    }
  }

  async fetchSnapshotProposals(createdGte): Promise<any> {
    this.logInfo('Fetching Snapshot Proposals');
    const snapshotQuery = gql`
    {
      proposals(orderBy: "start", orderDirection: desc, where: {space_in: ["tracer.eth"],created_gte:${createdGte}}) {
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

  public async snapShotEndedProposalsTask(simulate) {
    try {
      const tracerDAOData = await this.gettracerDAODataFromDB();
      if (!tracerDAOData?.snapshotProposalEndedTimestamp)
        this.logInfo(`snapshotProposalEndedTimestamp from DB does not exist`);
      const res: { proposals: ISnapshotProposal[] } = await this.fetchEndedSnapshotProposals(
        tracerDAOData?.snapshotProposalEndedTimestamp ?? this.timestamp,
      );

      this.logInfo(`No of proposals : ${res.proposals?.length}`);
      for (const proposal of res.proposals) {
        this.log(proposal.title);
        this.log(proposal.choices);
        this.log(proposal.scores);

        let maxScore = Math.max(...(proposal?.scores ?? []));
        let maxScoreIndex = proposal.scores.indexOf(maxScore);
        const maxPercentage = Math.floor((proposal.scores[maxScoreIndex] * 100) / proposal.scores_total);
        this.logInfo(`MaxScore: ${maxScore} MaxScoreIndex: ${maxScoreIndex}`);
        const resultChoice = proposal.choices[maxScoreIndex];
        this.logInfo(`Result Choice ; ${resultChoice}`);

        try {
          if (maxPercentage && resultChoice) {
            this.log('-------------------------');
            this.log(`title: ${proposal.title}\nid : ${proposal.id}\nmsg: ${proposal.body}`);

            const payloadMsg = `[t:Title] : ${proposal.title}\n\nChoice "[d:${resultChoice}]" got majority vote of [b:${maxPercentage}]%`;
            const message = `A Proposal "${proposal.title}" has been concluded on tracerDAO`;
            const title = 'Proposal Ended';
            const cta = `https://snapshot.org/#/tracer.eth/proposal/${proposal.id}`;
            await this.sendNotification({
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
          } else {
            this.logError(`Error while getting percentage result`);
          }
        } catch (error) {
          this.logError(error);
        }
      }
      await this.settracerDAODataInDB({ snapshotProposalEndedTimestamp: this.timestamp });
    } catch (error) {
      this.logError(error);
    }
  }

  async fetchEndedSnapshotProposals(endedGte): Promise<any> {
    this.logInfo('Fetching Ended Snapshot Proposals');
    const snapshotQuery = gql`
    {
      proposals(orderBy: "end", orderDirection: desc, where: {space_in: ["tracer.eth"],end_gte:${endedGte},state:"closed"}) {
        id
        title
        body
        created
        state
        choices
        start
        end
        scores
        scores_total
      }
    }
    `;

    const respend = await request(this.URL_SPACE_PROPOSAL, snapshotQuery);

    return respend;
  }

  // Get tracerDAO Data From DB
  async gettracerDAODataFromDB() {
    this.logInfo(`Getting tracerDAO Data from DB..`);
    const doc = await tracerDAOModel.findOne({ _id: 'tracerDAO_DATA' });
    this.logInfo(`tracerDAO Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set tracerDAO Data in DB
  async settracerDAODataInDB(tracerDAOData: ItracerDAOData) {
    this.logInfo(`Setting tracerDAO Data In DB`);
    this.log(tracerDAOData);
    await tracerDAOModel.findOneAndUpdate({ _id: 'tracerDAO_DATA' }, tracerDAOData, { upsert: true });
  }
}
