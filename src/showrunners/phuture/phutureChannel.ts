import { EPNSChannel } from '../../helpers/epnschannel';
import config from '../../config';
import { Logger } from 'winston';
import Container, { Inject, Service } from 'typedi';
import phutureSettings from './phutureSettings.json';
import { request, gql } from 'graphql-request';
import { IPhutureData, phutureModel } from './phutureModel';

@Service()
export default class PhutureChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Phuture',
      url: 'https://www.phuture.finance',
      useOffChain: true,
      address: '0x6575A93aBdFf85e5A6b97c2DB2b83bCEbc3574eC',
    });
  }

  async getDataFromDB(index: string): Promise<IPhutureData> {
    try {
      const data = await phutureModel.findOne({ _id: index }).lean();
      return data;
    } catch (e) {
      this.logError(e);
    }
  }

  async setDataToDB(index: string, data) {
    try {
      await phutureModel.findOneAndUpdate(
        {
          _id: index,
        },
        data,
        {
          upsert: true,
        },
      );
    } catch (e) {
      this.logError(e);
    }
  }
  // should run once a week
  async sendIndexWeeklyStatus(simulate): Promise<any> {
    try {
      const subscribers = simulate.logicOverride?.mode
        ? simulate.logicOverride?.user
        : await this.getChannelSubscribers();
      const { indexes } = await request(phutureSettings.PHUTURE_SUBGRAPH, this.fetchIndexAssetsInfo());
      console.log({ indexes });
      const response = await Promise.all(
        subscribers.map(async (subscriber: string) => {
          const res = await request(phutureSettings.PHUTURE_SUBGRAPH, this.fetchUserDetails(subscriber));
          return res.userIndexes;
        }),
      );

      const flattenedIndexes = response.reduce((prev, current) => [...current, ...prev], []);

      const sentNotification = await Promise.all(
        flattenedIndexes.map(async (oneIndex: any) => {
          const { user, index } = oneIndex;

          const foundIndex = indexes.find((i: any) => i.id === index.id);
          const afterOneWeekTimeStamp = this.timestamp + 60 * 60 * 24 * 7;
          const localIndex = await this.getDataFromDB(index.id);

          if (!localIndex || !localIndex.timestamp) {
            await this.setDataToDB(index.id, {
              assets: foundIndex.assets,
              timestamp: afterOneWeekTimeStamp,
              basePrice: foundIndex.basePrice,
            });
            return;
          }
          // find the corresponding index information

          if (localIndex.timestamp < afterOneWeekTimeStamp || true) {
            let currentBasePrice = +foundIndex.basePrice;
            let previousBasePrice = +localIndex.basePrice;
            let percentageChange = ((currentBasePrice - previousBasePrice) / previousBasePrice) * 100;

            const title = `Weekly Index Status`;
            const payloadTitle = title;
            // An index they’ve invested in does +x% in a week
            const msg = `${index.name} you've invested in did ${percentageChange.toFixed(2)}% in the past week!`;
            const payloadMsg = msg;
            const notificationType = 1;
            await this.sendNotification({
              title,
              payloadTitle,
              message: msg,
              payloadMsg,
              notificationType,
              simulate,
              image: null,
              recipient: user.id,
            });
            await this.setDataToDB(index.id, {
              assets: foundIndex.assets,
              timestamp: afterOneWeekTimeStamp,
              basePrice: foundIndex.basePrice,
            });
          }
        }),
      );

      return flattenedIndexes;
    } catch (e) {
      this.logError(e);
    }
  }

  // @dev configure the job of this funciton to only run once a month when the indexes have been rebalanced according to the schedule
  async sendRebalanceNotifs(simulate) {
    try {
      const subscribers = simulate.logicOverride?.mode
        ? simulate.logicOverride?.user
        : await this.getChannelSubscribers();
      const subscribersIndexes = await Promise.all(
        subscribers.map(async (subscriber: string) =>
          request(phutureSettings.PHUTURE_SUBGRAPH, this.fetchUserDetails(subscriber)),
        ),
      );
      const subscribersWithIndex = subscribersIndexes.filter((user) => user.userIndexes.length);

      // notify these users at the first workday of the month that their asset has been rebalanced
      // @dev https://docs.phuture.finance/our-products/PDI/methodology#rebalancing

      // send a subset notification to users with an index about how their index would expire soon
      const usersWithIndexAddress = subscribersWithIndex
        .map((oneSubscriber) => oneSubscriber.userIndexes?.[0]?.user.id)
        .filter(Boolean);
      // notification details

      const sentNotifications = await Promise.all(
        usersWithIndexAddress.map(async (oneAddress) => {
          const title = 'Rebalance Notification';
          const message =
            'Your Phuture indexes have been rebalanced, please log into your dashboard for more information';
          const notificationType = 3;
          const payload = {
            title,
            payloadTitle: title,
            message: message,
            payloadMsg: message,
            notificationType,
            simulate,
            image: null,
            recipient: oneAddress,
          };
          const response = await this.sendNotification(payload);
          return response;
        }),
      );

      return sentNotifications;
    } catch (e) {
      this.logError(e);
    }
  }

  async fetchAndStoreIndexInfo(): Promise<any[]> {
    const res = await request(phutureSettings.PHUTURE_SUBGRAPH, this.fetchIndexAssetsInfo());
    let indexes = res.indexes;
    const info = await Promise.all(
      indexes.map(async (index) => {
        const data = await this.getDataFromDB(index.id);
        if (!data) {
          await this.setDataToDB(index.id, {
            assets: index.assets,
            basePrice: index.basePrice,
          });
        }
        return index;
      }),
    );
    return info;
  }

  private fetchIndexAssetsInfo() {
    return gql`
      query Query {
        indexes {
          id
          name
          basePrice
          assets {
            id
            weight
          }
        }
      }
    `;
  }

  /**
   * @notice Query specific user details
   *
   * @param user Address of the user
   */

  private fetchUserDetails(user: string) {
    this.log(user);
    return gql`
      query Query {
        userIndexes(where: {user: "${user}"}) {
          id,
          user {
            id
          }
          index{
            id,
            name
          }
          
        }
      }
    `;
  }
}
