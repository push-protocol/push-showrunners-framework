import { Service, Inject, Container } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import moment from 'moment';
import axios from 'axios';
import { EPNSChannel } from '../../helpers/epnschannel';
import { ProposalModel } from './epnsGovModel';
import { Logger } from 'winston';
const gr = require('graphql-request');

const { request, gql } = gr;

export interface Proposal {
  creationTimestamp: Number;
}

const NOTIFICATION_TYPE = Object.freeze({
  ACTIVE_SNAPSHOT: 'active_snapshot',
  ENDING_SNAPSHOT: 'ending_snapshot',
  GOV_PROPOSAL: 'latest_gov_proposal',
  GOV_DISCUSSION: 'latest_gov_discussion',
});

@Service()
export default class epnsGovChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'EPNSGov',
      url: 'https://snapshot.org/#/epns.eth',
      useOffChain: true,
      address:'0xfE4A6Fbd27B496855245A1e8047F693f0aDfDb08'
    });
  }

  URL_SPACE_PROPOSAL = 'https://hub.snapshot.org/graphql';
  URL_DELEGATE = 'https://api.thegraph.com/subgraphs/name/snapshot-labs/snapshot';
  URL_GOV_PROPOSALS = 'https://gov.epns.io/c/8.json?order=created';
  URL_GOV_DISCUSSIONS = 'https://gov.epns.io/c/5.json?order=created';
  URL_GOV_FORUM = 'https://gov.epns.io';

  public async checkForumProposals(simulate) {
    this.logInfo(`Checking for new proposals...`);

    let govProposalObj = await this.fetchGovProposals();
    if (govProposalObj.success) {
      let govProposals = govProposalObj?.data;
      await this.checkForNewTopics(govProposals, NOTIFICATION_TYPE.GOV_PROPOSAL, simulate);
    }
  }

  public async checkForumDiscussions(simulate) {
    this.logInfo(`Checking for new proposals...`);

    let govDiscussionsObj = await this.fetchGovDiscussions();
    if (govDiscussionsObj.success) {
      let govDiscussions = govDiscussionsObj?.data;
      await this.checkForNewTopics(govDiscussions, NOTIFICATION_TYPE.GOV_DISCUSSION, simulate);
    }
  }

  public async checkActiveProposals(simulate) {
    try {
      this.logInfo(`Fetching Snapshot Proposals`);
      const space = await this.fetchSpaceDetails();

      const activeProposalTimestamp = await this.getLastUpdatedTimestamp(NOTIFICATION_TYPE.ACTIVE_SNAPSHOT);
      const activeProposals = await this.queryActiveProposals(space.id, activeProposalTimestamp, simulate);

      if (activeProposals.length != 0) {
        await this.processProposalInfo(activeProposals, NOTIFICATION_TYPE.ACTIVE_SNAPSHOT, simulate);
      } else {
        this.logInfo(`No active query for provided timestamp`);
      }

      await this.setCreationTimestampInDB(NOTIFICATION_TYPE.ACTIVE_SNAPSHOT);
    } catch (error) {
      this.logError(error);
    }
  }

  public async checkEndingProposals(simulate) {
    this.logInfo(`Fetching Snapshot Proposals`);
    const space = await this.fetchSpaceDetails();

    const endingProposals = await this.queryEndingProposals(space.id, simulate);
    if (endingProposals.length != 0) {
      await this.processProposalInfo(endingProposals, NOTIFICATION_TYPE.ENDING_SNAPSHOT, simulate);
    }

    await this.setCreationTimestampInDB(NOTIFICATION_TYPE.ENDING_SNAPSHOT);
  }

  async checkForNewTopics(topics, notificationType, simulate) {
    try {
      // Get the last updated timestamp stored in db to compare for finding new articles
      let timestamp = await this.getLastUpdatedTimestamp(notificationType);
      const lastTimestamp = simulate?.logicOverride?.mode ? simulate.logicOverride.timestamp : timestamp;
      let latestTimestamp = lastTimestamp;
      const upto = 0;

      //filter the array to include latest topics alone
      let newTopics = topics.filter(topic => Date.parse(topic.created_at) / 1000 > latestTimestamp);

      for (let i = newTopics.length - 1; i >= upto; i--) {
        this.logInfo(`i: ${i}, upto : ${upto}`);
        const topic = newTopics[i];
        const creationTimestamp = Date.parse(topic.created_at) / 1000;

        if (creationTimestamp > lastTimestamp || simulate?.logicOverride?.mode) {
          this.logInfo(`creationTimestamp > lastTimestamp. New topic Found!!`);

          if (creationTimestamp > latestTimestamp) {
            this.logInfo(`creationTimestamp > latestTimestamp updating latestTimestamp`);
            latestTimestamp = creationTimestamp;
          }
          const info = {
            title: 'New Topic on EPNS Governance Forum',
            message: `${topic.title}. Tap here to learn more.`,
            lastUpdatedBy: topic.last_poster_username,
            cta: `${this.URL_GOV_FORUM}/t/${topic.slug}/${topic.id}`,
            creationTimestamp: creationTimestamp,
            notificationType,
          };
          await this.sendNewNotification(info, simulate);
        } else {
          this.logInfo(`No new notification of type ${notificationType}`);
        }
      }

      // Set the latest Obtained Publication Date into DB
      await this.setCreationTimestampInDB(notificationType);
      this.logInfo(`Set PubDate over`);

      return { success: true };
    } catch (error) {
      this.logError(error);
    }
  }

  //process the proposal info from the array and trigger send notification
  public async processProposalInfo(proposals, notificationType, simulate) {
    this.logInfo(`Processing Snapshot Proposal Info`);

    this.log(proposals);
    for (let i = 0; i < proposals.length; i++) {
      this.logInfo(proposals[i].title);
      const info = {
        title: proposals[i].title,
        start: `${moment(proposals[i].start * 1000).format('MMMM Do YYYY')}`,
        end: `${moment(proposals[i].end * 1000).format('MMMM Do YYYY')}`,
        cta: `https://snapshot.org/#/${proposals[i].space.id}/proposal/${proposals[i].id}`,
        creationTimestamp: `${Math.floor(Date.now() / 1000)}`,
        space: `${proposals[i].space.id}`,
        notificationType,
      };

      await this.sendNewNotification(info, simulate);
    }
  }

  // Sends the new gov Notification
  async sendNewNotification(info, simulate) {
    try {
      this.logInfo(`Found new proposal - Sending notification...`);
      let title, payloadTitle, message, payloadMsg, cta;
      const notificationType = 1;

      switch (info.notificationType) {
        case NOTIFICATION_TYPE.ACTIVE_SNAPSHOT:
          title = `New Proposal is live in ${info.space}`;
          payloadTitle = `New Proposal is live in ${info.space}`;
          message = `Title:${info.title}\nStart Date:${info.start}\nEnd Date:${info.end}`;
          payloadMsg = `[d:Title] : ${info.title}\n[s:Start Date] : ${info.start}\n[t:End Date] : ${
            info.end
          } [timestamp: ${Math.floor(Date.now() / 1000)}]`;
          break;
        case NOTIFICATION_TYPE.ENDING_SNAPSHOT:
          title = 'Proposal voting ends in less than 24 hrs!';
          payloadTitle = 'Proposal voting ends in less than 24 hrs!';
          message = `Title:${info.title}\nEnd Date:${info.end}`;
          payloadMsg = `[d:Title] : ${info.title}\n[t:End Date] : ${info.end} [timestamp: ${Math.floor(
            Date.now() / 1000,
          )}]`;
          break;
        case NOTIFICATION_TYPE.GOV_DISCUSSION:
          title = 'New Topic Submitted on EPNS Governance Forum';
          payloadTitle = 'New Topic Submitted on EPNS Governance Forum';
          message = info.message;
          payloadMsg = info.message;
          break;
        case NOTIFICATION_TYPE.GOV_PROPOSAL:
          title = 'New Topic Submitted on EPNS Governance Forum';
          payloadTitle = 'New Topic Submitted on EPNS Governance Forum';
          message = info.message;
          payloadMsg = info.message;
          break;
        default:
          break;
      }

      await this.sendNotification({
        recipient: this.channelAddress,
        title: title,
        message: message,
        payloadMsg: payloadMsg,
        payloadTitle: payloadTitle,
        notificationType: notificationType,
        simulate: simulate,
        image: null,
        cta: info.cta,
        timestamp: info.creationTimestamp,
      });
      this.logInfo(`Completed sending notifications of type: ${info.notificationType}`);
    } catch (e) {
      this.logError(e);
    }
  }

  //Fetch Space Details
  public async fetchSpaceDetails() {
    this.logInfo(`Fetching EPNS space details`);
    const spaceQuery = gql`
      {
        space(id: "epns.eth") {
          id
          name
          symbol
          network
        }
      }
    `;
    const epnsSpace = await request(this.URL_SPACE_PROPOSAL, spaceQuery);
    this.logInfo(`EPNS space details:`);
    this.log(epnsSpace.space);
    return epnsSpace.space;
  }

  //Function to fetch proposal details
  public async queryActiveProposals(spaceID: any, timestamp, simulate) {
    this.logInfo(`Fetching Active Snapshot proposals`);

    const res = await request(
      this.URL_SPACE_PROPOSAL,
      gql`{
          proposals (
            skip: 0,
            where: {
              state: "active",
              space_in: ["${simulate?.logicOverride?.mode ? simulate.logicOverride.spaceID : spaceID}"],
              created_gte: ${simulate?.logicOverride?.mode ? simulate.logicOverride.timestamp : timestamp}
            },
            orderBy: "created",
            orderDirection: asc
          ) {
            id
            title
            start
            end
            space {
              id
              name
            }
          }
        }`,
    );

    return res.proposals;
  }

  //Function to fetch proposal details
  public async queryEndingProposals(spaceID: any, simulate) {
    this.logInfo(`Fetching Snapshot proposals ending in 24 hrs`);

    const res = await request(
      this.URL_SPACE_PROPOSAL,
      gql`{
          proposals (
            skip: 0,
            where: {
              space_in: ["${simulate?.logicOverride?.mode ? simulate.logicOverride.spaceID : spaceID}"],
              state: "active",
              end_lte:${
                simulate?.logicOverride?.mode ? simulate.logicOverride.timestamp : Math.floor(Date.now() / 1000 + 86400)
              }
            },
            orderBy: "end",
            orderDirection: asc
          ) {
            id
            title
            start
            end
            space {
              id
              name
            }
          }
        }`,
    );
    return res.proposals;
  }

  //Function to fetch forum gov proposals
  public async fetchGovProposals(): Promise<any> {
    this.logInfo(`Fetching Gov Proposals`);

    return await axios
      .get(this.URL_GOV_PROPOSALS)
      .then(function(response) {
        return {
          success: true,
          data: response.data.topic_list.topics,
        };
      })
      .catch(function(error) {
        return { success: false, error: error };
      });
  }

  //Function to fetch forum gov discussions
  public async fetchGovDiscussions(): Promise<any> {
    this.logInfo(`Fetching Gov Discussions`);

    return await axios
      .get(this.URL_GOV_DISCUSSIONS)
      .then(function(response) {
        return {
          success: true,
          data: response.data.topic_list.topics,
        };
      })
      .catch(function(error) {
        return { success: false, error: error };
      });
  }

  // Get creation timestamp From DB
  async getCreationTimestampFromDB(notificationType) {
    this.logInfo(`Getting creation timestamp from DB.. for ${notificationType}`);
    const doc = await ProposalModel.findOne({ _id: notificationType });
    this.logInfo(`Pub Date from DB obtained : ${doc?.creationTimestamp}`);
    return doc?.creationTimestamp;
  }

  // Get Last Updated Timestamp to compare with creationTimestamp of new article to determine notification whether notification is to be sent
  async getLastUpdatedTimestamp(notificationType) {
    this.logInfo(`Getting Last Updated Date`);
    const creationTimestampFromDB = await this.getCreationTimestampFromDB(notificationType);
    this.logInfo(
      `${
        !creationTimestampFromDB
          ? `creationTimestamp for notificationType: ${notificationType} from DB Null using Timestamp now`
          : `creationTimestamp for notificationType: ${notificationType} from DB exists`
      }`,
    );
    const compDate = creationTimestampFromDB ?? Math.floor(Date.now() / 1000);
    this.logInfo(`compDate : ${compDate}`);
    return compDate;
  }

  // Set Pub Date in DB
  async setCreationTimestampInDB(notificationType) {
    const creationTimestamp = Math.floor(Date.now() / 1000);
    this.logInfo(`Setting creationTimestamp to DB ${creationTimestamp} for notificationType ${notificationType}`);
    await ProposalModel.findOneAndUpdate(
      { _id: notificationType },
      { creationTimestamp: creationTimestamp },
      { upsert: true },
    );
    this.logInfo('creationTimestamp Set Successfully');
  }
}
