import { EPNSChannel } from '../../helpers/epnschannel';
import config, { defaultSdkSettings } from '../../config';
import { Logger } from 'winston';
import { Inject, Service } from 'typedi';
import claimABi from './claimABI.json';
import groSettings from './groSettings.json';
import { ethers } from 'ethers';
import { groModel, groWalletAirdropModel } from './groModel';
import axios from 'axios';

@Service()
export default class GroChannel extends EPNSChannel {
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
      name: 'GRO',
      url: 'https://app.gro.xyz/',
      useOffChain: true,
      address:'0x3c1f2e6ec3de7811e2daa2b8e132cdcd8e39851c'
    });
  }

  async getLatestBlocksFromDB() {
    this.logInfo('Getting latest Block from db');
    const data = await groModel.findOne({ _id: 'gro_latest' });
    this.logInfo(`Data is ${data}`);
    return data;
  }

  async getBlockNumbers(simulate, contract: ethers.Contract) {
    this.logInfo(`Getting Block Numbers`);

    const blockDB = await this.getLatestBlocksFromDB();
    let fromBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.fromBlock
      : blockDB?.latestClaimBlock ?? (await contract.provider.getBlockNumber());

    let toBlock = simulate?.logicOverride?.mode
      ? simulate?.logicOverride?.toBlock
      : await contract.provider.getBlockNumber();

    const contractNumber = await contract.provider.getBlockNumber();

    // fetch it from db

    const result = {
      fromBlock,
      toBlock: toBlock,
    };
    // this.log(result);
    return result;
  }

  async getClaimVestingEvents(simulate) {
    try {
      this.logInfo('Fetching claim vesting events for channel GRO');
      const sdk = await this.getSdk();
      const claimContract = await sdk.getContract(groSettings.claimContract, JSON.stringify(claimABi));
      const filter = claimContract.contract.filters.LogBonusClaimed();
      const blockNumbers = await this.getBlockNumbers(simulate, claimContract.contract);
      const events = await claimContract.contract.queryFilter(filter, blockNumbers.fromBlock, blockNumbers.toBlock);
      if (events) {
        events.forEach(async event => {
          let value = Number(ethers.BigNumber.from(event.args[1]._hex).toBigInt());
          value = value * 0.000000000000000001;

          const title = 'Reward claimed';
          const message = `${value.toFixed(3)} rewards claimed from global vesting pool`;
          const payloadTitle = `Reward claimed of value ${value.toFixed(3)} from GRO`;
          const payloadMsg = `${value.toFixed(3)} reward claimed from global vesting pool!`;
          const notificationType = 1;
          await this.sendNotification({
            title,
            message,
            payloadMsg,
            payloadTitle,
            recipient: event.args[0],
            simulate,
            image: null,
            notificationType,
          });
        });
      }
      await groModel.findByIdAndUpdate(
        { _id: 'gro_latest' },
        { latestClaimBlock: blockNumbers.toBlock },
        { upsert: true },
      );
    } catch (error) {
      this.logError(error);
    }
  }

  async getDataForWalletAddress(subscriber) {
    const walletAddressData = await groWalletAirdropModel.findOne({ walletAddress: subscriber });
    return walletAddressData;
  }

  async getClaimableAirdropNotif(simulate) {
    try {
      this.logInfo('Into getClaimableAirdrop Function');
      const sdk = await this.getSdk();
      const subscribers = await sdk.getSubscribedUsers();
      subscribers.forEach(async subscriber => {
        try {
          const resp = await axios.get(
            `https://h4sk4iwj75.execute-api.eu-west-2.amazonaws.com/stats/gro_personal_position_mc?address=${subscriber}&network=mainnet`,
          );
          if (resp) {
            const airdrops = resp.data.gro_personal_position_mc.ethereum.airdrops;
            const airdropLength = parseInt(resp.data.gro_personal_position_mc.ethereum.airdrops.length);
            const data = await this.getDataForWalletAddress(subscriber);

            if (data) {
              if (airdropLength > data.airdropLength) {
                airdrops.forEach(async (airdrop, index) => {
                  if (index > data.airdropLength - 1) {
                    if (airdrop.claimable === 'true') {
                      const title = `New ${airdrop.display_name} added which you are eligible to claim!`;
                      const message = `${airdrop.display_name} added and you can claim it`;
                      const payloadTitle = `${airdrop.display_name} added which you are eligible to claim`;
                      const payloadMsg = `New airdrop added! ${airdrop.display_name}. You can claim it`;
                      const notificationType = 1;
                      await this.sendNotification({
                        title,
                        message,
                        payloadMsg,
                        payloadTitle,
                        recipient: subscriber,
                        simulate,
                        image: null,
                        notificationType,
                      });
                      // send notification here
                      // await this.sendNotification({
                      // })
                    }
                  }
                });
                await groWalletAirdropModel.findOneAndUpdate(
                  {
                    walletAddress: subscriber,
                  },
                  {
                    airdropLength: airdrops.length,
                  },
                );
              }
            } else {
              airdrops.forEach(async airdrop => {
                if (airdrop.claimable === 'true') {
                  const title = `New ${airdrop.display_name} added which you are eligible to claim!`;
                  const message = `${airdrop.display_name} added and you can claim it`;
                  const payloadTitle = `${airdrop.display_name} added which you are eligible to claim`;
                  const payloadMsg = `New airdrop added! ${airdrop.display_name}. You can claim it`;
                  const notificationType = 1;
                  await this.sendNotification({
                    title,
                    message,
                    payloadMsg,
                    payloadTitle,
                    recipient: subscriber,
                    simulate,
                    image: null,
                    notificationType,
                  });
                }
              });
              const newData = new groWalletAirdropModel({
                walletAddress: subscriber,
                airdropLength: airdrops.length,
              });
              await newData.save();
            }
          }
        } catch (er) {
          this.logError(er);
        }
      });
    } catch (e) {
      this.logError(e);
    }
  }

  async getAirdropSoon(simulate) {
    try {
      const sdk = await this.getSdk();
      const subscribers = await sdk.getSubscribedUsers();
      subscribers.forEach(async subscriber => {
        const resp = await axios.get(
          `https://h4sk4iwj75.execute-api.eu-west-2.amazonaws.com/stats/gro_personal_position_mc?address=${subscriber}&network=mainnet`,
        );
        if (resp) {
          const airdrops = resp.data.gro_personal_position_mc.ethereum.airdrops;
          airdrops.forEach(async airdrop => {
            if (airdrop.participated === ' true' && airdrop.claimed === 'false' && airdrop.expired === 'false') {
              if (airdrop.expiry_ts) {
                const expiryTime = parseInt(airdrop.expiry_ts) * 1000;
                const currentTime = new Date().getTime();
                const diff = expiryTime - currentTime;
                const days = diff / (24 * 3600 * 1000);
                if (days < 5) {
                  // send notifications here!
                  const title = `${airdrop.display_name} soon to expire in ${days} days! Hurry!`;
                  const message = `${airdrop.display_name} going to expire in ${days} days`;
                  const payloadTitle = `${airdrop.display_name} is going to expire in ${days} days, hurry and claim it!`;
                  const payloadMsg = `${airdrop.display_name} is going to expire in ${days} days.`;
                  const notificationType = 1;
                  await this.sendNotification({
                    title,
                    message,
                    payloadMsg,
                    payloadTitle,
                    recipient: subscriber,
                    simulate,
                    image: null,
                    notificationType,
                  });
                }
              }
            }
          });
        }
      });
    } catch (e) {
      this.logError(e);
    }
  }
}
