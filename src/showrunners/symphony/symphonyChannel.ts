import { Inject, Service } from 'typedi';
import { add, Logger } from 'winston';
import config, { defaultSdkSettings } from '../../config';
import symphonySettings from './symphonySettings.json';
import symphonyABI from './symphonyABI.json';
import erc20ABI from './erc20ABI.json';
import { EPNSChannel } from '../../helpers/epnschannel';
import { request, gql } from 'graphql-request';
import { ISymphonySchema, SymphonyModel } from './symphonyModel';
import { ethers } from 'ethers';

@Service()
export default class SymphonyChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3PolygonMainnetProvider,
      dirname: __dirname,
      name: 'Symphony Finance',
      url: 'https://symphony.finance/',
      useOffChain: true,
      address: '0xd32908F63713F514aDDBE3962A2dE7112fdCD4A7',
    });
  }

  GRAPH_QL_URL = symphonySettings.symphonySubGraphURL;

  private orderQuery(id: string): string {
    return gql`{
    order(id:"${id}") {
        id
        orderId
        recipient {
          address
        }
        inputToken
        outputToken
        inputAmount
        minReturnAmount
        stoplossAmount
        executedTxHash
    }
  }`;
  }

  private ordersQuery(createdAtBlock_gte: string): string {
    return gql`
      {
        orders(where: { createdAtBlock_gte: ${createdAtBlock_gte} }) {
          id
          orderId
          recipient
          createdAtBlock
          inputToken
          outputToken
          inputAmount
          minReturnAmount
          stoplossAmount
          executedTxHash
        }
      }
    `;
  }

  private blockNoQuery(): string {
    return gql`
      {
        _meta {
          block {
            number
          }
        }
      }
    `;
  }

  async test(simulate) {
    this.logInfo('First Test');
    await this.fetchOrderExecutedLogs(simulate);
  }

  async fetchOrderExecutedLogs(simulate) {
    this.logInfo(`fetchOrderExecutedLogs()`);
    const sdk = await this.getSdk();
    const symphony = await sdk.getContract(
      symphonySettings.symphonyDeployedContractAddress,
      JSON.stringify(symphonyABI),
    );
    const blockNos = await this.getBlockNumbers(simulate, symphony.contract, 1);
    let fromBlock = blockNos.fromBlock;
    let toBlock = blockNos.toBlock;

    if (!fromBlock) {
      this.logInfo(`From Block is the latest running for first time... Aborting`);
      await this.setSymphonyDataInDB({ limitOrderBlockNo: toBlock });
      return;
    }

    this.logInfo(`fromBlock: ${fromBlock}, toBlock: ${toBlock}`);
    //
    //
    const orders = await this.fetchOrdersFromGraph(fromBlock);

    this.logInfo(` No Of evts : ${orders.orders.length}`);
    for (const order of orders.orders) {
      try {
        this.log(order);
        const inputTokenData = await this.getTokenSymbolFromAddress(order.inputToken);
        const outputTokenData = await this.getTokenSymbolFromAddress(order.outputToken);
        this.log(inputTokenData);
        this.log(outputTokenData);
        const inputTokenAmount = parseFloat(order.inputAmount) / Math.pow(10, inputTokenData.decimals);
        const outputTokenAmount = parseFloat(order.minReturnAmount) / Math.pow(10, outputTokenData.decimals);
        this.logInfo(`Input Token Symbol : ${inputTokenData.symbol} Output Token Symbol : ${outputTokenData.symbol}`);

        const message = `Your order for ${inputTokenData.symbol}-${outputTokenData.symbol} has been executed`;
        const payloadMsg = `Your order for [b:${inputTokenData.symbol}-${outputTokenData.symbol}] has been executed\nInput Amount : ${inputTokenAmount}\nOutput Amount : ${outputTokenAmount}`;

        await this.sendNotification({
          recipient: order.recipient,
          image: null,
          message: message,
          payloadMsg: payloadMsg,
          title: 'Order Executed',
          notificationType: 3,
          payloadTitle: 'Order Executed',
          simulate: simulate,
          cta: 'https://polygon.symphony.finance',
        });
      } catch (error) {
        this.logError(error);
      }
    }
    await this.setSymphonyDataInDB({ limitOrderBlockNo: toBlock });
  }

  async fetchOrderFromGraph(id: string): Promise<{ order: Order }> {
    const orderQuery = this.orderQuery(id);
    return await request(this.GRAPH_QL_URL, orderQuery);
  }

  async fetchOrdersFromGraph(blockNo: string): Promise<{ orders: Order[] }> {
    const ordersQuery = this.ordersQuery(blockNo);
    return await request(this.GRAPH_QL_URL, ordersQuery);
  }

  async fetchBlockNoFromGraph(): Promise<number> {
    this.logInfo(`Fetching block no from graph`);
    const blockNoQuery = this.blockNoQuery();
    const res = await request(this.GRAPH_QL_URL, blockNoQuery);
    return res._meta.block.number;
  }

  async getTokenSymbolFromAddress(address: string): Promise<TokenData> {
    this.logInfo(`Getting token symbol for : ${address}`);
    let tokenData: TokenData = await this.cached.getCache(address);
    this.log(tokenData);
    if (!tokenData || !tokenData?.symbol) {
      this.logInfo(`Symbol doesnt exist in cache fetching from contract`);
      const sdk = await this.getSdk();
      const erc20 = await sdk.getContract(address, JSON.stringify(erc20ABI));
      const symbol = await erc20.contract.symbol();
      const decimals = await erc20.contract.decimals();
      tokenData = { symbol: symbol, decimals: decimals };
      this.cached.setCache(address, JSON.stringify(tokenData));
    }
    return tokenData;
  }

  async getBlockNumbers(simulate, contract: ethers.Contract, option: number) {
    this.logInfo(`Getting Block Numbers option: ${option}`);
    const symphonyData = await this.getSymphonyDataFromDB();
    const blockFromDB = symphonyData?.limitOrderBlockNo;

    let fromBlock = simulate?.logicOverride?.mode ? simulate?.logicOverride?.fromBlock : blockFromDB ?? 'latest';

    let toBlock = simulate?.logicOverride?.mode ? simulate?.logicOverride?.toBlock : await this.fetchBlockNoFromGraph();

    const result = {
      fromBlock: fromBlock,
      toBlock: toBlock,
    };
    this.log(result);
    return result;
  }

  // Get Symphony Data From DB
  async getSymphonyDataFromDB() {
    this.logInfo(`Getting Symphony Data from DB..`);
    const doc = await SymphonyModel.findOne({ _id: 'SYMPHONY_DATA' });
    this.logInfo(`Symphony Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set Symphony Data in DB
  async setSymphonyDataInDB(symphonyData: ISymphonySchema) {
    this.logInfo(`Setting Symphony Data In DB`);
    this.log(symphonyData);
    await SymphonyModel.findOneAndUpdate({ _id: 'SYMPHONY_DATA' }, symphonyData, { upsert: true });
  }
}

interface TokenData {
  symbol: string;
  decimals: number;
}

interface Order {
  id: string;
  inputAmount: string;
  inputToken: string;
  inputTokenSymbol: string;
  minReturnAmount: string;
  orderId: string;
  outputToken: string;
  outputTokenSymbol: string;
  recipient: string;
}
