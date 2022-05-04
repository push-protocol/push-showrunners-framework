/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable prettier/prettier */
import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { DefiantModel } from './defiantModel';
import defiantSettings from './defiantSettings.json';
import axios from 'axios';
import xml2js from 'xml2js';

const xml2js = require('xml2js');
const util = require('util');


export interface DefiantArticle {
  pubDate: Number;
}

@Service()
export default class DefiantChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'The Defiant',
      url: 'https://thedefiant.io/',
      useOffChain: true,
    });
  }
  async checkForNewArticles(simulate) {
    try {
      // Get the articles from the RSS Feed
      const articles = await this.getArticles(simulate);

      // Get the comparer pub date stored in db to compare for finding new articles
      const compDate = await this.getComparerDate();
      let latestDate = compDate;
      const upto = simulate?.logicOverride?.mode ? articles.length - 2 : 0;

      for (let i = articles.length - 1; i >= upto; i--) {
        const article = articles[i];
        const publicationTimestamp = Date.parse(article.pubDate[0]) / 1000;
        this.logInfo(
          `publicationTimestamp : ${publicationTimestamp} compDate : ${compDate} publicationTimestamp > compDate : ${publicationTimestamp >
            compDate}`,
        );
        if (publicationTimestamp > compDate || simulate?.logicOverride?.mode) {
          this.logInfo(`publicationTimestamp > compDate. New Article Found!!`);

          if (publicationTimestamp > latestDate) {
            this.logInfo(`publicationTimestamp > latestDate updating latestDate`);
            latestDate = publicationTimestamp;
          }

          const info = {
            title: article.title[0],
            link: article.link[0],
            description: article.description,
            publicationTimestamp: publicationTimestamp,
          };

          this.log(info);

          this.logInfo('Found new article sending notification');
          await this.sendNewArticleNotification(info, simulate);
        }
      }

      // Set the latest Obtained Publication Date into DB
      await this.setPubDateInDB(latestDate);

      this.logInfo(`Set PubDate over`);

      return { success: true };
    } catch (error) {
      this.logError(error);
    }
  }

  public async getArticles(simulate): Promise<any> {
    this.logInfo('getArticles called.. Checking For New Articles');

    const url = defiantSettings.FEED_URL;
    // const parser = new xml2js.Parser();

    this.logInfo('Fetching Articles');
    let res = await axios.get(url);
    xml2js.parseStringPromise = util.promisify(xml2js.parseString);
    let result = await xml2js.parseStringPromise(res.data);
    this.logInfo('Articles obtained');

    return result.rss.channel[0].item;
  }

  async parseStringPromise(){

  }

  async sendNewArticleNotification(info, simulate) {
    try {
      const title = `${info.title}`;
      const payloadTitle = `${info.title}`;
      const message = `${info.description}`;
      const payloadMsg = `${info.description}`;
      const notificationType = 1;

      await this.sendNotification({
        recipient: this.channelAddress,
        title: title,
        message: message,
        payloadMsg: payloadMsg,
        payloadTitle: payloadTitle,
        notificationType: notificationType,
        simulate: simulate,
        image: null,
        cta: info.link,
        timestamp: info.publicationTimestamp,
      });
    } catch (e) {
      this.logError(e);
    }
  }

  // Get Publication Date From DB
  async getPubDateFromDB() {
    this.logInfo(`Getting pubDate from DB..`);
    const doc = await DefiantModel.findOne({ _id: 'DEFIANT_PUB_DATE' });
    this.logInfo(`Pub Date from DB obtained : ${doc?.pubDate}`);
    return doc?.pubDate;
  }

  // Get Comparer Date to compare with pubdate of new article to determine notification whether notification is to be sent
  async getComparerDate() {
    this.logInfo(`Getting Comparer Date`);
    const pubDateFromDB = await this.getPubDateFromDB();
    this.logInfo(`${!pubDateFromDB ? 'Pubdate from DB Null using Timestamp now' : 'PubDate from DB exists'}`);
    const compDate = pubDateFromDB ?? Math.floor(Date.now() / 1000);
    this.logInfo(`compDate : ${compDate}`);
    return compDate;
  }

  // Set Pub Date in DB
  async setPubDateInDB(pubDate: Number | number) {
    this.logInfo(`Setting pubdate to DB ${pubDate}`);
    await DefiantModel.findOneAndUpdate({ _id: 'DEFIANT_PUB_DATE' }, { pubDate: pubDate }, { upsert: true });
    this.logInfo('PubDate Set Successfully');
  }
}
