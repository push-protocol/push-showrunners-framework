import { EPNSChannel } from '../../helpers/epnschannel';
import config, { defaultSdkSettings } from '../../config';
import { Logger } from 'winston';
import Container, { Inject, Service } from 'typedi';
import stakingRewardsStoreABI from './StakingRewardsStore.json';
import request, { gql } from 'graphql-request';
import bancorSettings from './bancorSettings.json';

import ERC20ABI from './ERC20.json';
import liquidityProtectionSettingsABI from './liquidityProtectionSettings.json';
import { ethers } from 'ethers';
import { BancorModel, IBancorSchema } from './bancorModel';
import axios from 'axios';

export interface ISnapshotProposal {
  id: string;
  title: string;
  body: string;
  created: number;
  choices: string[];
  start: number;
  end: number;
}

@Service()
export class BancorChannel extends EPNSChannel {
  URL_SPACE_PROPOSAL = 'https://hub.snapshot.org/graphql';

  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Bancor',
      url: 'https://www.bancor.network/',
      useOffChain: true,
      address:'0x7F41abf7fDb9E4A6373EC3BAB3Df814b5CCceCC3'
    });
  }

  async trimTokenSymbolUtil(tokenSymbol: string) {
    try {
      const firstThree: string = tokenSymbol.substr(0, 3);
      const lastThree: string = tokenSymbol.substr(tokenSymbol.length - 3);
      if (firstThree === 'BNT') {
        tokenSymbol = tokenSymbol.substr(3);
      }
      if (lastThree === 'BNT') {
        tokenSymbol = tokenSymbol.substr(0, tokenSymbol.length - 3);
      }
      return tokenSymbol;
    } catch (e) {
      this.logError(e);
    }
  }

  async poolProgramAddedTask(simulate) {
    try {
      this.logInfo(`Pool Program Added Task`);
      const sdk = await this.getSdk();
      const stakingRewardStore = await sdk.getContract(
        bancorSettings.StakingRewardsStoreAddress,
        JSON.stringify(stakingRewardsStoreABI),
      );
      const evts = await this.fetchPoolProgramAddedEvents(simulate, stakingRewardStore.contract);
      for (const evt of evts) {
        const args = evt.args;
        this.log(args);
        const token = await sdk.getContract(args.poolToken, JSON.stringify(ERC20ABI));
        const tokenSymbol = await token.contract.symbol();
        const trimmedTokenSymbol = await this.trimTokenSymbolUtil(tokenSymbol);
        const message = `New Liquidity mining program is bootstrapped for ${trimmedTokenSymbol}`;
        const title = `${trimmedTokenSymbol} Pool Program bootstrapped`;
        const { BNT_USD_PRICE, liqPrice } = await this.fetchBancorApiForBootstrapping(args.poolToken);
        const floatBNTPrice = parseFloat(BNT_USD_PRICE);
        const floatLiqPrice = parseFloat(liqPrice);
        const payloadMsg = `New Liquidity mining program is bootstrapped for [d:${trimmedTokenSymbol}]`;
        const cta = `https://app.bancor.network/pools`;
        if (floatLiqPrice > 2000 * floatBNTPrice) {
          this.logInfo('Condition satisfied ----> liquidity price is greater than condition');
          await this.sendNotification({
            image: null,
            message: message,
            payloadMsg: payloadMsg,
            title: title,
            payloadTitle: title,
            notificationType: 1,
            recipient: this.channelAddress,
            simulate: simulate,
            cta: cta,
          });
        } else {
          this.logInfo('Condition not satisfied');
        }
      }
    } catch (error) {
      this.logError(error);
    }
  }

  async snapShotProposalsTask(simulate, xHoursAgo = 21600) {
    try {
      const resp: { proposals: ISnapshotProposal[] } = await this.fetchSnapshotProposals(simulate);
      if (resp?.proposals) this.logInfo(`No of Proposals : ${resp?.proposals.length}`);
      for (const proposal of resp.proposals) {
        this.log('-------------------------');
        this.log(`title: ${proposal.title}\nid : ${proposal.id}`);

        const payloadMsg = `A Proposal has been created on Bancor\n[b:${proposal.title}][timestamp:${Date.now() /
          1000}]`;
        const message = `A Proposal "${proposal.title}" has been created on Bancor`;
        const title = 'New Proposal';
        const cta = `https://snapshot.org/#/bancornetwork.eth/proposal/${proposal.id}`;

        await this.sendNotification({
          recipient: this.channelAddress,
          image: null,
          message: message,
          payloadMsg: payloadMsg,
          title: title,
          payloadTitle: title,
          notificationType: 1,
          simulate: simulate,
          cta: cta,
        });
      }
    } catch (error) {
      this.logError(error);
    }
  }

  async tokenUpdateTask(simulate) {
    const sdk = await this.getSdk();
    const liqProSet = await sdk.getContract(
      bancorSettings.LiquidityProtectionSettingsAddress,
      JSON.stringify(liquidityProtectionSettingsABI),
    );
    const evts: any = await this.fetchNetworkTokenMintingLimitUpdateEvents(simulate, liqProSet.contract);
    for (const evt of evts) {
      const { args } = evt;
      const tokenNameContract = await sdk.getContract(args[0], JSON.stringify(ERC20ABI));
      const name = await tokenNameContract.contract.symbol();
      const prevLimit = ethers.utils.formatEther(ethers.BigNumber.from(evt.args[1]).toBigInt());
      const newLimit = ethers.utils.formatEther(ethers.BigNumber.from(evt.args[2]).toBigInt());
      const title = `Trading limit changed on ${name} POOL`;
      const msg = `${name} token limit changed from ${prevLimit} to ${newLimit}`;
      const payloadMsg = `[d:${name}] token value changed from ${prevLimit} to ${newLimit}`;
      const cta = `https://app.bancor.network/swap?from=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&to=${args.poolAnchor}`;
      await this.sendNotification({
        image: null,
        message: msg,
        notificationType: 1,
        payloadMsg: payloadMsg,
        payloadTitle: title,
        recipient: this.channelAddress,
        simulate: simulate,
        title: title,
        cta: cta,
      });
    }
  }

  async newTokenListingsTask(simulate) {
    const sdk = await this.getSdk();
    const liqProSet = await sdk.getContract(
      bancorSettings.LiquidityProtectionSettingsAddress,
      JSON.stringify(liquidityProtectionSettingsABI),
    );
    const evts = await this.fetchPoolProgramWhitelistedEvents(simulate, liqProSet.contract);

    for (const evt of evts) {
      const args = evt.args;
      const token = await sdk.getContract(args.poolAnchor, JSON.stringify(ERC20ABI));
      const tokenSymbol = await token.contract.symbol();

      const title = `${tokenSymbol} Listed`;
      const msg = `${tokenSymbol} is now listed on Bancor`;
      const payloadMsg = `[d:${tokenSymbol}] is now listed on Bancor`;
      const cta = `https://app.bancor.network/swap?from=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&to=${args.poolAnchor}`;

      this.log({
        image: null,
        message: msg,
        notificationType: 1,
        payloadMsg: payloadMsg,
        payloadTitle: title,
        recipient: this.channelAddress,
        simulate: simulate,
        title: title,
        cta: cta,
      });
      this.log(cta);

      await this.sendNotification({
        image: null,
        message: msg,
        notificationType: 1,
        payloadMsg: payloadMsg,
        payloadTitle: title,
        recipient: this.channelAddress,
        simulate: simulate,
        title: title,
        cta: cta,
      });
    }
  }

  async getBlockNumbers(simulate, contract: ethers.Contract, option: number) {
    this.logInfo(`Getting Block Numbers option: ${option}`);
    const bancorData = await this.getBancorDataFromDB();
    const blockFromDB = option == 1 ? bancorData?.poolProgramAddeddBlockNo : bancorData?.newTokenListingBlockNo;

    let fromBlock = simulate?.logicOverride?.mode ? simulate?.logicOverride?.fromBlock : blockFromDB ?? 'latest';

    let toBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.toBlock
      : await contract.provider.getBlockNumber();

    const result = {
      fromBlock: fromBlock,
      toBlock: toBlock,
    };
    this.log(result);
    return result;
  }

  async fetchSnapshotProposals(simulate?: any, xHoursAgo = 6): Promise<any> {
    this.logInfo('Fetching Snapshot Proposals');
    const doc = await this.getBancorDataFromDB();
    const created_gte = doc?.snapshotTimestamp ?? Date.now() / 1000;
    if (!doc?.snapshotTimestamp) this.logInfo(`No Timestamp in DB using Date.now()`);
    this.setBancorDataInDB({ snapshotTimestamp: parseInt((Date.now() / 1000).toFixed()) });
    const snapshotQuery = gql`
    {
      proposals(orderBy: "start", orderDirection: desc, where: {space_in: ["bancornetwork.eth"],created_gte:${simulate?.created_gte ??
        created_gte.toFixed()}}) {
        id
        title
        body
        created
        choices
        start
        end
      }
    }
    `;

    const resp = await request(this.URL_SPACE_PROPOSAL, snapshotQuery);
    return resp;
  }

  async fetchPoolProgramAddedEvents(simulate, stakingRewardStore: ethers.Contract) {
    const poolPgmAddedFilter = stakingRewardStore.filters.PoolProgramAdded();
    const blockNos = await this.getBlockNumbers(simulate, stakingRewardStore, 1);
    const fromBlock = await blockNos.fromBlock;
    const toBlock = await blockNos.toBlock;
    this.log(`Fetching events from ${fromBlock} to ${toBlock}`);
    const evts = await stakingRewardStore.queryFilter(poolPgmAddedFilter, fromBlock, toBlock);

    if (!simulate?.logicOverride?.mode) {
      await this.setBancorDataInDB({ poolProgramAddeddBlockNo: toBlock });
    }
    this.log(`Events Fetched Successfully eventCount:${evts.length}`);

    return evts;
  }

  async fetchPoolProgramWhitelistedEvents(simulate, liquidityProtectionSettings: ethers.Contract) {
    const poolPgmAddedFilter = liquidityProtectionSettings.filters.PoolWhitelistUpdated();
    const blockNos = await this.getBlockNumbers(simulate, liquidityProtectionSettings, 2);
    const fromBlock = await blockNos.fromBlock;
    const toBlock = await blockNos.toBlock;
    this.log(`Fetching events from ${fromBlock} to ${toBlock}`);

    const evts = await liquidityProtectionSettings.queryFilter(poolPgmAddedFilter, fromBlock, toBlock);

    if (!simulate?.logicOverride?.mode) {
      await this.setBancorDataInDB({ newTokenListingBlockNo: toBlock });
    }
    this.log(`Events Fetched Successfully eventCount:${evts.length}`);
    return evts;
  }

  // Get Bancor Data From DB
  async getBancorDataFromDB() {
    this.logInfo(`Getting Bancor Data from DB..`);
    const doc = await BancorModel.findOne({ _id: 'BANCOR_DATA' });
    this.logInfo(`Bancor Data obtained`);
    this.log(doc);
    return doc;
  }

  // Set Bancor Data in DB
  async setBancorDataInDB(bancorData: IBancorSchema) {
    this.logInfo(`Setting Bancor Data In DB`);
    this.log(bancorData);
    await BancorModel.findOneAndUpdate({ _id: 'BANCOR_DATA' }, bancorData, { upsert: true });
  }

  async fetchNetworkTokenMintingLimitUpdateEvents(simulate, contract: ethers.Contract) {
    this.logInfo('fetching network token minting update events..');
    const filters = contract.filters.NetworkTokenMintingLimitUpdated();
    const blockNos = await this.getBlockNumbers(simulate, contract, 2);
    const { fromBlock, toBlock } = await blockNos;
    this.logInfo(`Fetching events from ${fromBlock} to ${toBlock}`);
    const events = await contract.queryFilter(filters, fromBlock, toBlock);
    return events;
  }

  async fetchBancorApiForBootstrapping(id: any) {
    const api = 'https://api-v2.bancor.network/pools';
    const resp = await axios.get(api);
    let BNT_USD_PRICE = null;
    resp.data.data.forEach(data => {
      data.reserves.forEach(reserve => {
        if (reserve.dlt_id === '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C') {
          BNT_USD_PRICE = reserve.price.usd;
        }
      });
    });
    console.log(BNT_USD_PRICE, 'BNT Price');
    // fetching liquidity of a particular pool
    let liqPrice = null;
    resp.data.data.forEach(data => {
      if (data.dlt_id === id) {
        liqPrice = data.liquidity.usd;
      }
    });
    return {
      liqPrice,
      BNT_USD_PRICE,
    };
  }
}
