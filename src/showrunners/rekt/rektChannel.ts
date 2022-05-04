/* eslint-disable prettier/prettier */
import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { RektModel } from './rektModel';
import rektSettings from './rektSettings.json';
import axios from 'axios';
import xml2js from 'xml2js';

export interface RektArticle {
  pubDate: Number;
}

@Service()
export default class RektChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'REKT',
      url: 'https://rekt.news/',
      useOffChain: true,
      address: '0x57cD6665e725232123F5250328E35Db6ABf6d80C',
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
        // this.logInfo(
        //   `publicationTimestamp : ${publicationTimestamp} compDate : ${compDate} publicationTimestamp > compDate : ${publicationTimestamp >
        //     compDate}`,
        // );
        if (publicationTimestamp > compDate || simulate?.logicOverride?.mode) {
          this.logInfo(`publicationTimestamp > compDate. New Article Found!!`);
          if (publicationTimestamp > latestDate && publicationTimestamp < this.timestamp) {
            this.logInfo(`publicationTimestamp > latestDate updating latestDate`);
            latestDate = publicationTimestamp;
          } else if (publicationTimestamp > this.timestamp) {
            this.logError(`Publication Date Doubtful, Updating the Latest Date`);
          }

          const info = {
            title: article.title[0],
            link: article.link[0],
            description: article.description,
            publicationTimestamp: publicationTimestamp,
          };
          // Set the latest Obtained Publication Date into DB
          await this.setPubDateInDB(latestDate);
          this.log(info);

          this.logInfo('Found new article sending notification');
          await this.sendNewArticleNotification(info, simulate);
        }
      }

      this.logInfo(`Set PubDate over`);

      return { success: true };
    } catch (error) {
      this.logError(error);
    }
  }

  public async getArticles(simulate): Promise<any> {
    this.logInfo('getArticles called.. Checking For New Articles');

    const url = rektSettings.RSS_FEED_URL;
    const parser = new xml2js.Parser();

    this.logInfo('Fetching Articles');
    let res = await axios.get(url);

    let result = await parser.parseStringPromise(res.data);
    this.logInfo('Articles obtained');

    return result.rss.channel[0].item;
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
    const doc = await RektModel.findOne({ _id: 'REKT_PUB_DATE' });
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
    await RektModel.findOneAndUpdate({ _id: 'REKT_PUB_DATE' }, { pubDate: pubDate }, { upsert: true });
    this.logInfo('PubDate Set Successfully');
  }
}
