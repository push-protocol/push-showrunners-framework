import { Service, Inject, Container } from 'typedi';
import config, { defaultSdkSettings, settings } from '../../config';

import Maker from '@makerdao/dai';
import McdPlugin from '@makerdao/dai-plugin-mcd';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import mainnetAddress from './contractAddress.json';

@Service()
export default class oasisChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger, @Inject('cached') public cached) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Oasis',
      url: 'https://oasis.app/',
      useOffChain: true,
      address: '0x12b3eE60Df8ea26D03b8035Ec90434a38A82C4C7',
    });
  }

  async getOraclePrice(provider, pipAddress, slot) {
    const storageHexToBigNumber = (uint256: string) => {
      const matches = uint256.match(/^0x(\w+)$/);
      if (!matches?.length) {
        throw new Error(`invalid uint256: ${uint256}`);
      }

      const match = matches[0];
      return match.length <= 32
        ? [new BigNumber(0), new BigNumber(uint256)]
        : [
            new BigNumber(`0x${match.substring(0, match.length - 32)}`),
            new BigNumber(`0x${match.substring(match.length - 32, match.length)}`),
          ];
    };
    const slotCurrent = slot;
    const priceHex = await provider.getStorageAt(pipAddress, slotCurrent);
    const p = storageHexToBigNumber(priceHex);
    return p[1].shiftedBy(-18);
  }

  public async getLatestPrices() {
    this.logInfo(`getLatestPrices()`);
    let priceObject = {};

    const provider = ethers.getDefaultProvider(
      this.cSettings.networkToMonitor,
      this.cSettings.sdkSettings.networkSettings,
    );

    for (const property in mainnetAddress) {
      if (property.includes('PIP_')) {
        const currPrice = await this.getOraclePrice(provider, mainnetAddress[property], 3);
        const nextPrice = await this.getOraclePrice(provider, mainnetAddress[property], 4);
        priceObject[property.slice(4)] = { currPrice: currPrice.toFormat(2), nextPrice: nextPrice.toFormat(2) };
      }
    }
    this.log(priceObject);
    return priceObject;
  }

  public async sendMessageToContract(simulate) {
    this.logInfo(`Looking at vaults for liquidation alert`);
    this.logInfo(`Initialising maker and mcd manager`);
    try {
      const maker = await Maker.create('http', {
        plugins: [McdPlugin],
        url: `https://mainnet.infura.io/v3/${settings.infuraSettings.projectID}`,
      });
      const manager = maker.service('mcd:cdpManager');
      const sdk = await this.getSdk();
      const users = simulate?.logicOverride?.mode ? [simulate?.logicOverride?.address] : await sdk.getSubscribedUsers();
      const priceMapping = await this.getLatestPrices();
      for (let i in users) {
        const user = users[i];
        //fetch proxy address set by Oasis:
        const proxyAddress = await maker.service('proxy').getProxyAddress(user);
        if (!proxyAddress) {
          this.logInfo(`User has used Oasis`);

          await this.getVaultDetails(user, proxyAddress, manager, sdk, priceMapping, simulate);
        } else {
          this.logInfo(`User has not used Oasis`);
          continue;
        }
      }
      this.logInfo(`Finished Oasis logic`);
    } catch (error) {
      this.logInfo(`${settings.infuraSettings.projectID}`);
      this.logError(error);
    }
  }

  // take collaterl amount
  // multiply with next price and divide it by debtValue for getting the collateralization ratio

  public async getVaultDetails(
    user: String,
    proxyAddress: String,
    manager: any,
    sdk: any,
    priceMapping: any,
    simulate,
  ) {
    try {
      this.logInfo(`[Oasis]- Checking for ${user}`);
      //fetch all vaults
      const data = await manager.getCdpIds(user);
      this.log(data);
      for (let i in data) {
        //fetch details of each vault

        const vault = await manager.getCdp(data[i].id);
        const ilk = vault.ilk;
        const nextPriceVault = parseFloat(priceMapping[ilk.slice(0, -2)].nextPrice.replace(/,/g, ''));

        const vaultid = vault.id;
        const collateralAmount = parseFloat(vault.collateralAmount); // amount of collateral tokens
        const debtValue = parseFloat(vault.debtValue); // amount of Dai debt
        const collateralizationRatio = parseFloat(vault.collateralizationRatio); // collateralValue / debt
        const liquidationPrice = parseFloat(vault.liquidationPrice); // vault becomes unsafe at this price
        const isSafe = vault.isSafe; //bool value if vault is safe or not
        const collateralizationNextPrice = (nextPriceVault * collateralAmount * 100) / debtValue;
        const liquidationRatio = (liquidationPrice * collateralAmount) / debtValue;

        if (debtValue !== 0) {
          this.logInfo(`liquidationRatio : ${liquidationRatio}`);
          this.logInfo(`collateralizationNextPrice : ${collateralizationNextPrice}`);
          this.logInfo(`isSafe : ${isSafe}`);
          this.logInfo(`nextPriceVault : ${isSafe}`);
          this.logInfo(`collateralAmount : ${vault.collateralAmount}`);
          this.logInfo(`Vault : ${vault.ilk}`);
          if (isSafe && collateralizationNextPrice <= 175) {
            this.logInfo(`Vault is safe but is at risk of liquidation`);

            await this.sendOasisNotification(
              user,
              vaultid,
              1,
              collateralizationNextPrice,
              liquidationRatio * 100,
              ilk,
              simulate,
            );
          } else if (!isSafe) {
            this.logInfo(`Vault is unsafe`);
            await this.sendOasisNotification(user, vaultid, 2, null, null, ilk, simulate);
          }
        } else {
          this.logInfo('Debt Value is 0 for this vault!');
        }
      }
    } catch (err) {
      this.logError(err);
    }
  }

  public async sendOasisNotification(
    user,
    vaultid,
    type,
    collateralizationRatio = null,
    liquidationRatio = null,
    ilk,
    simulate,
  ) {
    let title, message, payloadTitle, payloadMsg, notifType, cta, storageType, trxConfirmWait, payload, ipfsHash, tx;
    const sdk = await this.getSdk();
    const epns = sdk.advanced.getInteractableContracts(
      config.web3RopstenNetwork,
      settings,
      this.walletKey,
      config.deployedContract,
      config.deployedContractABI,
    );
    cta = `https://oasis.app/${vaultid}`;

    switch (type) {
      case 1: //for funds about to get liquidated
        this.logger.info(`+ Sending notification for vault ${vaultid} which is at risk of liquidation`);
        title = `Vault ${vaultid} is at Risk`;
        // message = `Your Vault ${ilk} ${vaultid} is ${Math.floor(percent)}% away from liquidation `
        message = `Your ${ilk} Vault ${vaultid} has reached a collateralization ratio of ${collateralizationRatio.toFixed()}%.\nThe liquidation ratio for this vault is ${liquidationRatio.toFixed()}%.\nClick here to visit your vault!`;
        payloadTitle = `Vault ${vaultid} is at Risk`;
        // payloadMsg = `Your Vault [t:${ilk}] [d:${vaultid}] is [s:${percent}]% away from liquidation [timestamp: ${Math.floor(new Date() / 1000)}]`;
        payloadMsg = `Your [t:${ilk}] Vault [d:${vaultid}] has reached a collateralization ratio of [s:${collateralizationRatio.toFixed()}%].\nThe liquidation ratio for this vault is [b:${liquidationRatio.toFixed()}]%.\n\nClick here to visit your vault!`;

        notifType = 3;
        storageType = 1;
        trxConfirmWait = 0;
        await this.sendNotification({
          recipient: user,
          notificationType: notifType,
          title: title,
          message: message,
          payloadTitle: payloadTitle,
          payloadMsg: payloadMsg,
          image: null,
          simulate: simulate,
        });

      case 2: //for funds that are below LR
        this.logger.info(
          `[${new Date(Date.now())}]-[Oasis]- Sending notification for vault ${vaultid} which is undercollateralised`,
        );
        title = `Vault ${vaultid} is at Risk`;
        message = `Your Vault ${ilk} ${vaultid} is below liquidation ratio.`;
        payloadTitle = `Vault ${vaultid} is at Risk`;
        payloadMsg = `Your Vault [t:${ilk}] [d:${vaultid}] is below liquidation ratio. [timestamp: ${Math.floor(
          Date.now() / 1000,
        )}]`;
        notifType = 3;
        storageType = 1;
        trxConfirmWait = 0;

        await this.sendNotification({
          recipient: user,
          notificationType: notifType,
          title: title,
          message: message,
          payloadTitle: payloadTitle,
          payloadMsg: payloadMsg,
          image: null,
          simulate: simulate,
        });
    }
  }
}
