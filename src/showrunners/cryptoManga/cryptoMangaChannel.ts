/* eslint-disable prettier/prettier */
import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings } from '../../config';
import { request, gql } from 'graphql-request';
import { Logger } from 'winston';
import { EPNSChannel, ISendNotificationParams } from '../../helpers/epnschannel';
import { cryptoMangaModel, IcryptoMangaData } from './cryptoMangaModel';

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
export default class CryptoMangaChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'CryptoManga',
      url: 'https://cryptomanga.club/',
      useOffChain: true,
      address:'0x0B430A1651E6A64510afC97195040359941d0b23'
    });
  }
  URL_SPACE_PROPOSAL = 'https://hub.snapshot.org/graphql';

  //
  // Showrunners
  //

  async snapShotProposalsTask(simulate) {
    try {
      const cryptoMangaData = await this.getcryptoMangaDataFromDB();
      if (!cryptoMangaData?.snapshotProposalLatestTimestamp)
        this.logInfo(`snapshotProposalLatestTimestamp from DB does not exist`);
      const res: { proposals: ISnapshotProposal[] } = await this.fetchSnapshotProposals(
        cryptoMangaData?.snapshotProposalLatestTimestamp ?? this.timestamp,
      );

      this.logInfo(`No of proposals : ${res.proposals.length}`);
      for (const proposal of res.proposals) {
        try {
          this.log('-------------------------');
          this.log(`title: ${proposal.title}\nid : ${proposal.id}\nmsg: ${proposal.body}`);

          const payloadMsg = `A Proposal has been created on cryptoManga\n[b:${proposal.title}][timestamp:${Date.now() /
            1000}]`;
          const message = `A Proposal "${proposal.title}" has been created on cryptoManga`;
          const title = 'New Proposal';
          const cta = `https://snapshot.org/#/mangabank.eth/proposal/${proposal.id}`;
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
      await this.setcryptoMangaDataInDB({ snapshotProposalLatestTimestamp: this.timestamp });
    } catch (error) {
      this.logError(error);
    }
  }

  async fetchSnapshotProposals(createdGte): Promise<any> {
    this.logInfo('Fetching Snapshot Proposals');
    const snapshotQuery = gql`
    {
      proposals(orderBy: "start", orderDirection: desc, where: {space_in: ["mangabank.eth"],created_gte:${createdGte}}) {
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
      const cryptoMangaData = await this.getcryptoMangaDataFromDB();
      if (!cryptoMangaData?.snapshotProposalEndedTimestamp)
        this.logInfo(`snapshotProposalEndedTimestamp from DB does not exist`);
      const res: { proposals: ISnapshotProposal[] } = await this.fetchEndedSnapshotProposals(
        cryptoMangaData?.snapshotProposalEndedTimestamp ?? this.timestamp,
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
            const message = `A Proposal "${proposal.title}" has been concluded on cryptoManga`;
            const title = 'Proposal Ended';
            const cta = `https://snapshot.org/#/mangabank.eth/proposal/${proposal.id}`;
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
          }
        } catch (error) {
          this.logError(error);
        }
      }
      await this.setcryptoMangaDataInDB({ snapshotProposalEndedTimestamp: this.timestamp });
    } catch (error) {
      this.logError(error);
    }
  }

  async fetchEndedSnapshotProposals(endedGte): Promise<any> {
    this.logInfo('Fetching Ended Snapshot Proposals');
    const snapshotQuery = gql`
    {
      proposals(orderBy: "end", orderDirection: desc, where: {space_in: ["mangabank.eth"],end_gte:${endedGte},state:"closed"}) {
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

  async fetchActiveSnapshotProposals(): Promise<any> {
    this.logInfo('Fetching Active Snapshot Proposals');
    const snapshotQuery = gql`
      {
        proposals(
          orderBy: "start"
          orderDirection: desc
          where: { space_in: ["mangabank.eth"], state: "active" }
        ) {
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

    const respactive = await request(this.URL_SPACE_PROPOSAL, snapshotQuery);

    return respactive;
  }

  async snapShotConcludingProposalsTask(simulate) {
    const res: { proposals: ISnapshotProposal[] } = await this.fetchActiveSnapshotProposals();

    this.logInfo(`No of proposals : ${res.proposals.length}`);

    for (const proposal of res.proposals) {
      const diff = proposal.end - this.timestamp;
      this.log(diff / (60 * 60 * 24));
      if (diff <= 86400 && diff > 0) {
        try {
          this.log('-------------------------');
          this.log(`title: ${proposal.title}\nid : ${proposal.id}\nmsg: ${proposal.body}`);

          const payloadMsg = `A Proposal is concluding soon on cryptoManga\n[b:${proposal.title}]`;
          const message = `A Proposal "${proposal.title}" is concluding soon on cryptoManga \n ${proposal.end}`;
          const title = 'Proposal Ending Soon';
          const cta = `https://snapshot.org/#/mangabank.eth/proposal/${proposal.id}`;
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
    }
  }

  // Get cryptoManga Data From DB
  async getcryptoMangaDataFromDB() {
    this.logInfo(`Getting cryptoManga Data from DB..`);
    const doc = await cryptoMangaModel.findOne({ _id: 'cryptoManga_DATA' });
    this.logInfo(`cryptoManga Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set cryptoManga Data in DB
  async setcryptoMangaDataInDB(cryptoMangaData: IcryptoMangaData) {
    this.logInfo(`Setting cryptoManga Data In DB`);
    this.log(cryptoMangaData);
    await cryptoMangaModel.findOneAndUpdate({ _id: 'cryptoManga_DATA' }, cryptoMangaData, { upsert: true });
  }
}
