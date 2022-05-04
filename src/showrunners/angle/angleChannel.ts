import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { request, gql } from 'graphql-request';
import angleSettings from './angleSettings.json';
import { OracleData, Perpetual, PoolData } from './angleInterfaces';
import { ethers } from 'ethers';

@Service()
export default class AngleChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Angle',
      url: 'https://app.angle.money/',
      useOffChain: true,
      address:'0xa2dee32662f6243da539bf6a8613f9a9e39843d3'
    });
  }

  private poolDataQuery() {
    return gql`
      query Query {
        poolDatas {
          id
          poolManager
          stableName
          collatName
          totalHedgeAmount
          limitHAHedge
          stockUser
          feesForSLPs
          stockSLP
          timestamp
          totalSLPFees
          apr
        }
      }
    `;
  }

  private poolHistoricalDataQuery(timestamp_lt: number, stableName: string, collatName: string) {
    return gql`
    query Query {
      poolHistoricalDatas(where:{timestamp_lt:"${timestamp_lt}",stableName:"${stableName}",collatName:"${collatName}"},orderBy:timestamp,orderDirection:desc,first:1) {
        id
        poolManager
        stableName
        collatName
        totalHedgeAmount
        limitHAHedge
        stockUser
        feesForSLPs
        stockSLP
        timestamp
        totalSLPFees
        apr
      }
    }

    `;
  }

  private perpetualQuery() {
    return gql`
      query Query {
        perpetuals {
          perpetualID
          liquidationPrice
          stableName
          collatName
          owner
        }
      }
    `;
  }

  async forceCloseTask(simulate) {
    try {
      const poolDatas = await this.fetchPoolData();
      this.logInfo(` forceCloseTask(simulate) length : ${poolDatas.length}`);
      for (const poolData of poolDatas) {
        const shouldForceClose = simulate?.logicOverride
          ? true
          : poolData.totalHedgeAmount / poolData.stockUser >= poolData.limitHAHedge / 10 ** 9;
        this.logInfo(`shouldForceClose : ${shouldForceClose}`);
        if (shouldForceClose) {
          const message = `Pool ${poolData.collatName}/${poolData.stableName} is at a risk of force closure`;
          const payloadMsg = `Pool [b:${poolData.collatName}/${poolData.stableName}] is at a risk of force closure\nPool ID : [t:${poolData.id}]`;
          const title = `Force Closure Risk`;
          const cta = `https://app.angle.money`;

          await this.sendNotification({
            image: null,
            message: message,
            payloadMsg: payloadMsg,
            title: title,
            payloadTitle: title,
            notificationType: 3,
            recipient: poolData.poolManager,
            simulate: simulate,
            cta: cta,
          });
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  async liquidationTask(simulate) {
    try {
      this.logInfo(`liquidationTask`);
      const perpetuals = await this.fetchPerpetualData();

      for (const perp of perpetuals) {
        const oracleData = await this.fetchOracleData(perp.collatName, perp.stableName);

        const shouldNotify =
          oracleData[0].rateLower <= perp.liquidationPrice * (1 + angleSettings.LIQUIDATION_TRIGGER_PERCENTAGE / 100);
        this.logInfo(
          `\nliquidationPrice : ${perp.liquidationPrice}\nrateLower : ${oracleData[0].rateLower}\nshouldNotify : ${shouldNotify}\n\n`,
        );

        if (shouldNotify) {
          this.logInfo(`Send Liquidation Warning`);
          const liquidationPrice = this.formatPrice(perp.liquidationPrice);
          const rateLower = this.formatPrice(oracleData[0].rateLower);

          const message = `The Perpetual #${perp.perpetualID} on ${perp.collatName}/${perp.stableName} is about to be liquidated. Current exchange rate is ${rateLower} and should remain over ${liquidationPrice}`;
          const payloadMsg = `The Perpetual [b:#${perp.perpetualID}] on [b:${perp.collatName}/${perp.stableName}] is about to be [d:liquidated]. Current exchange rate is [t:${rateLower}] and should remain over [t:${liquidationPrice}]`;
          const title = `Liquidation Risk`;
          const cta = `https://app.angle.money`;

          await this.sendNotification({
            image: null,
            message: message,
            payloadMsg: payloadMsg,
            title: title,
            payloadTitle: title,
            notificationType: 3,
            recipient: perp.owner,
            simulate: simulate,
            cta: cta,
          });
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  async yieldTask(simulate) {
    try {
      this.logInfo(`YieldTask`);
      const poolDatas = await this.fetchPoolData();
      this.logInfo(`length : ${poolDatas.length}`);
      for (const poolData of poolDatas) {
        const poolHistoricalDatas1 = await this.fetchPoolHistoryDatas(
          Math.floor(Date.now() / 1000) - 3600 * 24 * 7,
          poolData.stableName,
          poolData.collatName,
        );

        const poolHistoricalDatas2 = await this.fetchPoolHistoryDatas(
          Math.floor(Date.now() / 1000) - 2 * 3600 * 24 * 7,
          poolData.stableName,
          poolData.collatName,
        );

        const poolHistoricalData1 = poolHistoricalDatas1[0];
        const poolHistoricalData2 = poolHistoricalDatas2[0];

        const aprForPastWeek = this.calculateAPR(poolData, poolHistoricalData1);

        const aprForPrevPastWeek = this.calculateAPR(poolHistoricalData1, poolHistoricalData2);

        const aprForPastWeekFormatted = this.formatAPR(aprForPastWeek);
        const aprForPrevPastWeekFormatted = this.formatAPR(aprForPrevPastWeek);

        this.logInfo(`aprForPastWeek = ${aprForPastWeek}`);
        this.logInfo(`aprForPrevPastWeek = ${aprForPrevPastWeek}`);

        if (aprForPastWeekFormatted > 12) {
          const message = `Yield is juicy on Angle. Apr on ${poolData.collatName}/${
            poolData.stableName
          } just hit ${Math.floor(aprForPastWeekFormatted)}%`;
          const payloadMsg = `Yield is juicy on Angle. Apr on [b:${poolData.collatName}/${
            poolData.stableName
          }] just hit [t:${Math.floor(aprForPastWeekFormatted)}%]`;
          const title = `Yield Update`;
          const cta = `https://app.angle.money`;
          await this.sendNotification({
            image: null,
            message: message,
            payloadMsg: payloadMsg,
            title: title,
            payloadTitle: title,
            notificationType: 3,
            recipient: poolData.poolManager,
            simulate: simulate,
            cta: cta,
          });
        } else if (aprForPastWeek > aprForPrevPastWeek * 1.3) {
          const message = `Yield is juicy on Angle. Apr on ${poolData.collatName}/${poolData.stableName} increased by more than 30% over the past week.`;
          const payloadMsg = `Yield is juicy on Angle. Apr on [b:${poolData.collatName}/${poolData.stableName}] increased by more than [t:30%] over the past week.`;
          const title = `Yield Update`;
          const cta = `https://app.angle.money`;
          await this.sendNotification({
            image: null,
            message: message,
            payloadMsg: payloadMsg,
            title: title,
            payloadTitle: title,
            notificationType: 3,
            recipient: poolData.poolManager,
            simulate: simulate,
            cta: cta,
          });
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  private async fetchPoolData(): Promise<PoolData[]> {
    const res = await request(angleSettings.TRANSACTION_GRAPH_URL, this.poolDataQuery());
    return res.poolDatas;
  }

  private async fetchPoolHistoryDatas(
    timestamp_lt: number,
    stableName: string,
    collatName: string,
  ): Promise<PoolData[]> {
    const res = await request(
      angleSettings.TRANSACTION_GRAPH_URL,
      this.poolHistoricalDataQuery(timestamp_lt, stableName, collatName),
    );
    return res.poolHistoricalDatas;
  }

  private async fetchPerpetualData(): Promise<Perpetual[]> {
    const res = await request(angleSettings.PERPETUALS_GRAPH_URL, this.perpetualQuery());
    return res.perpetuals;
  }

  private async fetchOracleData(tokenIn: string, tokenOut: string): Promise<OracleData[]> {
    const query = gql`
      query Query {
        oracleDatas(where: { tokenIn: "${tokenIn}", tokenOut: "${tokenOut}"}) {
          tokenIn
          tokenOut
          rateLower
          rateUpper
        }
      }
    `;

    const res = await request(angleSettings.PERIPHERY_GRAPH_URL, query);

    return res.oracleDatas;
  }

  private formatPrice(price: number | string) {
    return parseFloat(ethers.utils.formatEther(price)).toFixed(4);
  }

  private calculateAPR(poolData: PoolData, poolHistoricalData: PoolData) {
    this.logInfo(`${poolData.collatName}/${poolData.stableName}`);
    const a = poolData.totalSLPFees - poolHistoricalData.totalSLPFees;
    const b = 10 ** 18 / poolData.stockSLP;
    const c = poolData.apr / 10 ** 9;
    const res = a * b * 53 + c;
    this.log({ a: a, b: b, c: c, res: res });

    return res;
  }

  private formatAPR(apr: number) {
    return Math.floor(apr * 100);
  }
}
