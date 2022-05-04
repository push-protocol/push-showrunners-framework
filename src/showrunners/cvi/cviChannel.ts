import { Inject, Service } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';
import channelSettings from './cviSettings.json';
import cviEthPlatformABI from './cviEthPlatform.json';
import cviEthPlatformLiquidationABI from './cviEthPlatformLiquidation.json';
import axios from 'axios';
import { Contract } from '@ethersproject/contracts';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

interface Position {
  address: string;
  positionUnitsAmount: BigNumber;
  leverage: number;
  openCVIValue: number;
  creationTimestamp: number;
  originalCreationTimestamp: number;
}

interface PositionBalance {
  currentPositionBalance: BigNumber;
  isPositive: boolean;
  positionUnitsAmount: BigNumber;
  leverage: number;
  fundingFees: BigNumber;
  marginDebt: BigNumber;
}

const BLOCK_NUMBER = 'block_number';

@Service()
export default class CviChannel extends EPNSChannel {
  channelName = 'CVI';
  cviEthPlatform: {
    provider: BaseProvider;
    contract: Contract;
    signingContract: Contract | null;
  };

  cviEthPlatformLiquidation: {
    provider: BaseProvider;
    contract: Contract;
    signingContract: Contract | null;
  };

  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'CVI',
      url: 'https://cvi.finance/platform',
      useOffChain: true,
      address: '0x2dbf5aFead4759E6151590E4a8F6cD596B7044F8',
    });
  }

  //
  // Showrunners
  //
  async checkForLiquidationRisks(simulate) {
    try {
      const override = simulate?.logicOverride;
      this.log('Check for liquidation risks task begins');
      let sdks = await this.getHelpers(simulate);
      let users = override ? simulate?.logicOverride?.users ?? [] : await sdks.sdk.getSubscribedUsers();
      for (const u of users) {
        let shoudlNotify = override?.force || (await this.processLiquidationCheck(sdks));
        const title = `Liquidation Risk`;
        const msg = `Your position is at risk of liquidation please take appropriate steps`;
        const payloadMsg = `Your position is at [d:risk of liquidation] please take appropriate steps`;
        this.logInfo(`shouldNotify : ${shoudlNotify}, force: ${override?.force}`);
        this.logInfo(msg);
        if (shoudlNotify) {
          await this.sendNotification({
            recipient: u,
            title: title,
            image: null,
            message: msg,
            payloadMsg: payloadMsg,
            payloadTitle: title,
            notificationType: 3,
            simulate: simulate,
          });
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  //
  //
  async checkHourlyVariations(simulate) {
    try {
      let sdks = await this.getSdks();
      let sdk = sdks.sdk;
      const override = simulate?.logicOverride;
      let prices = await this.fetchPriceData();
      let final = override ? simulate?.logicOverride.final : prices[0][1];
      let prev = override ? simulate?.logicOverride.prev : prices[1][1];
      let hourlyPercentageChange = ((final - prev) * 100) / prev;
      let absolutePercentageChange = Math.abs(Math.round(hourlyPercentageChange));

      let word = '';
      let wordFormatted = '';
      if (hourlyPercentageChange < -10) {
        wordFormatted = '[d:dropped]';
        word = 'dropped';
      } else if (hourlyPercentageChange > 10) {
        wordFormatted = '[s:went up]';
        word = 'went up';
      } else {
        this.logInfo('Percentage change below threshold. Aborting.....');
        return;
      }

      const title = 'Index Variation';
      const msg = `The index value ${word} ${absolutePercentageChange}% in 1 hour`;
      const payloadMsg = `The index value ${wordFormatted} ${absolutePercentageChange}% in 1 hour`;
      this.logInfo(msg);
      await this.sendNotification({
        recipient: this.channelAddress,
        image: null,
        message: msg,
        payloadMsg: payloadMsg,
        title: title,
        payloadTitle: title,
        notificationType: 1,
        simulate: simulate,
      });
    } catch (error) {
      this.logError(`Error occured while checking for hourly variations`);
    }
  }

  private async getHelpers(simulate) {
    let sdks = await this.getSdks();
    let sdk = sdks.sdk;

    this.cviEthPlatform =
      this.cviEthPlatform ??
      (await sdk.getContract(channelSettings.cviEthPlatformContractAddress, JSON.stringify(cviEthPlatformABI)));

    this.cviEthPlatformLiquidation =
      this.cviEthPlatformLiquidation ??
      (await sdk.getContract(
        channelSettings.cviEthPlatformLiquidationContractAddress,
        JSON.stringify(cviEthPlatformLiquidationABI),
      ));

    const logicOverride =
      typeof simulate == 'object'
        ? simulate.hasOwnProperty('logicOverride') && simulate.logicOverride.mode
          ? simulate.logicOverride.mode
          : false
        : false;

    // Initailize block if it is missing
    let cachedBlock = (await this.cached.getCache(BLOCK_NUMBER)) ?? 0;
    this.logInfo(`Cached block ${cachedBlock}`);
    let blockNumber = await this.cviEthPlatform.provider.getBlockNumber();
    if (cachedBlock === 0) {
      this.cached.setCache(BLOCK_NUMBER, blockNumber);
    }

    const fromBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('fromBlock')
        ? Number(simulate.logicOverride.fromBlock)
        : Number(cachedBlock);

    const toBlock =
      logicOverride && simulate.logicOverride.hasOwnProperty('toBlock')
        ? Number(simulate.logicOverride.toBlock)
        : await this.cviEthPlatform.provider.getBlockNumber();

    return {
      logicOverride: logicOverride,
      fromBlock: fromBlock,
      toBlock: toBlock,
      sdk: sdk,
      epns: sdks.epns,
      cviEthPlatform: this.cviEthPlatform,
      cviEthPlatformLiquidation: this.cviEthPlatformLiquidation,
    };
  }

  private async getSdks() {
    this.logInfo('getSdksHelper called');
    // const walletKey = await this.getWalletKey();
    const sdk = await this.getSdk();
    const epns = sdk.advanced.getInteractableContracts(
      config.web3RopstenNetwork,
      defaultSdkSettings.networkSettings,
      this.walletKey,
      config.deployedContract,
      config.deployedContractABI,
    );
    return {
      sdk: sdk,
      epns: epns,
      walletKey: this.walletKey,
    };
  }

  async checkWeeklyVariations(simulate) {
    try {
      const d = await this.processPriceData();
      const dayAgoHours = (d.latest[0] - d.dayAgo[0]) / (60 * 60);
      const weekAgoHours = (d.latest[0] - d.weekAgo[0]) / (60 * 60);
      const weeklyPercentageChange = simulate?.logicOverride
        ? simulate?.logicOverride?.weeklyPercentageChange
        : d.weeklyPercentageChange;
      this.logInfo(
        `dayAgoHours: ${dayAgoHours}, weekAgoHours: ${weekAgoHours}, weeklyPercentageChange: ${weeklyPercentageChange}`,
      );
      let word = '';
      let wordFormatted = '';
      if (weeklyPercentageChange < -10) {
        wordFormatted = '[d:dropped]';
        word = 'dropped';
      } else if (weeklyPercentageChange > 10) {
        wordFormatted = '[s:went up]';
        word = 'went up';
      } else {
        this.logInfo('Percentage change below threshold. Aborting.....');
        return;
      }

      const formattedWeeklyPercentChange = Math.abs(Math.round(weeklyPercentageChange));

      const title = 'Index Variation';
      const msg = `The index value ${word} ${formattedWeeklyPercentChange}% in 7 days`;
      const payloadMsg = `The index value ${wordFormatted} ${formattedWeeklyPercentChange}% in 7 days`;
      this.logInfo(msg);
      await this.sendNotification({
        notificationType: 1,
        recipient: this.channelAddress,
        image: null,
        message: msg,
        payloadMsg: payloadMsg,
        payloadTitle: title,
        simulate: simulate,
        title: title,
      });
    } catch (error) {
      this.logError(`Error occured while checking for weekly variations`);
    }
  }

  async checkDailyVariations(simulate) {
    try {
      const d = await this.processPriceData();
      const dayAgoHours = (d.latest[0] - d.dayAgo[0]) / (60 * 60);
      const weekAgoHours = (d.latest[0] - d.weekAgo[0]) / (60 * 60);
      const dailyPercentageChange = simulate?.logicOverride
        ? simulate?.logicOverride?.dailyPercentageChange
        : d.dailyPercentageChange;
      this.logInfo(
        `dayAgoHours: ${dayAgoHours}, weekAgoHours: ${weekAgoHours}, dailyPercentageChange: ${dailyPercentageChange}`,
      );
      let word = '';
      let wordFormatted = '';
      if (dailyPercentageChange < -10) {
        wordFormatted = '[d:dropped]';
        word = 'dropped';
      } else if (dailyPercentageChange > 10) {
        wordFormatted = '[s:went up]';
        word = 'went up';
      } else {
        this.logInfo('Percentage change below threshold. Aborting.....');
        return;
      }

      const formattedDailyPercentChange = Math.abs(Math.round(dailyPercentageChange));

      const title = 'Index Variation';
      const msg = `The index value ${word} ${formattedDailyPercentChange}% in 24 hours`;
      const payloadMsg = `The index value ${wordFormatted} ${formattedDailyPercentChange}% in 24 hours`;
      this.logInfo(msg);
      await this.sendNotification({
        notificationType: 1,
        recipient: this.channelAddress,
        image: null,
        message: msg,
        payloadMsg: payloadMsg,
        payloadTitle: title,
        simulate: simulate,
        title: title,
      });
    } catch (error) {
      this.logError(`Error occured while checking for daily variations`);
    }
  }
  //
  // Fetchers
  //

  private async fetchPriceData() {
    let res = await axios({
      method: 'get',
      url: 'https://api-v2.cvi.finance/history',
      headers: {},
    });

    let prices = res.data;
    return prices;
  }

  private async processPriceData() {
    const prices = await this.fetchPriceData();

    return {
      latest: prices[0],
      dayAgo: prices[24],
      weekAgo: prices[168],
      weeklyPercentageChange: ((prices[0][1] - prices[168][1]) * 100) / prices[168][1],
      dailyPercentageChange: ((prices[0][1] - prices[24][1]) * 100) / prices[24][1],
    };
  }

  private async processLiquidationCheck(sdks): Promise<boolean> {
    let cvi = sdks.cviEthPlatform;
    let cviEthLiquidation = sdks.cviEthPlatformLiquidation;

    this.log(`Fetching positions from CVI platform`);
    let positionRaw = await cvi.contract.positions('0xab450D37F5C8148f4125734C645F3E777a90f003');
    let position: Position = {
      address: '0xab450D37F5C8148f4125734C645F3E777a90f003',
      positionUnitsAmount: positionRaw[0],
      leverage: positionRaw[1],
      openCVIValue: positionRaw[2],
      creationTimestamp: positionRaw[3],
      originalCreationTimestamp: positionRaw[4],
    };

    let positionBalanceRaw = await cvi.contract.calculatePositionBalance('0xab450D37F5C8148f4125734C645F3E777a90f003');

    let positionBalance: PositionBalance = {
      currentPositionBalance: positionBalanceRaw[0],
      isPositive: positionBalanceRaw[1],
      positionUnitsAmount: positionBalanceRaw[2],
      leverage: positionBalanceRaw[3],
      fundingFees: positionBalanceRaw[4],
      marginDebt: positionBalanceRaw[5],
    };

    const liquid = await this.getLiquidationDetails(cviEthLiquidation.contract, positionBalance);
    let sendNotification = await this.checkLiquidation(
      positionBalance,
      position,
      liquid.liquidationMinThresholdPercent,
      20000,
      liquid.liquidationMaxFeePercentage,
    );

    return sendNotification;
  }

  private async getLiquidationDetails(
    cviEthLiquidationContract: Contract,
    positionBalance: PositionBalance,
  ): Promise<{ liquidationMinThresholdPercent: any; liquidationMaxFeePercentage: any }> {
    this.log(`Fetching liquidationMinThresholdPercents of leverage ${positionBalance.leverage}`);
    let liquidationMinThresholdPercent = await cviEthLiquidationContract.liquidationMinThresholdPercents(
      positionBalance.leverage,
    );
    this.log(`liquidationMinThresholdPercents[${positionBalance.leverage}]  : ${liquidationMinThresholdPercent}`);

    this.log(`Fetching liquidationMaxFeePercentage`);
    let liquidationMaxFeePercentage = await cviEthLiquidationContract.LIQUIDATION_MAX_FEE_PERCENTAGE();

    this.log(`liquidationMaxFeePercentage : ${liquidationMaxFeePercentage}`);

    return {
      liquidationMaxFeePercentage: liquidationMaxFeePercentage,
      liquidationMinThresholdPercent: liquidationMinThresholdPercent,
    };
  }

  private async checkLiquidation(
    posBal: PositionBalance,
    pos: Position,
    liquidationMinThresholdPercent: number,
    maxCviValue: number,
    liquidationMaxFeePercentage: number,
  ): Promise<boolean> {
    this.log(`liquidationMaxFeePercentage: ${liquidationMaxFeePercentage}`);
    this.log(`posBal.positionUnitsAmount : ${posBal.positionUnitsAmount}`);
    this.log(`pos.openCVIValue: ${pos.openCVIValue}`);
    this.log(`maxCviValue: ${maxCviValue}`);
    this.log(`pos.leverage: ${pos.leverage}`);
    this.log(`posBal.currentPositionBalance: ${posBal.currentPositionBalance}`);

    let comparer = posBal.positionUnitsAmount
      .mul(liquidationMinThresholdPercent)
      .mul(pos.openCVIValue)
      .div(maxCviValue)
      .div(pos.leverage);

    this.log(`Comparer : ${comparer.toString()}`);

    comparer = comparer.div(liquidationMaxFeePercentage);
    let shouldSentWarning =
      !posBal.isPositive ||
      posBal.currentPositionBalance.lte(comparer) ||
      (posBal.currentPositionBalance.gte(comparer) && posBal.currentPositionBalance.lte(comparer.mul(102).div(100)));

    return shouldSentWarning;
  }
}
