import { Service, Inject } from 'typedi';
import config from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { request, gql } from 'graphql-request';

// Import the Push SDK
import { PushAPI } from "@pushprotocol/restapi";
 
import { ethers } from "ethers";
import bank from "./bank.json";

import 'dotenv/config'
require('dotenv').config()

// Smart contract deployed Chain (Network)
const NETWORK_TO_MONITOR = config.web3PolygonMumbaiRPC; 
const bankAbi = bank.abi;
const bankAddress = "0x46b37B93376074F4e9ae6834A3FA8A7a41f946a3" // edit address

@Service()
export default class BankChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'Bank',
      url: 'https://arv-bitcloud.vercel.app/',
      useOffChain: true,
    });
  }

  /*
    event Apy(uint256 apy);
    event Investments(uint256 investment);
    event HolidayStatus(bool holiday);

    Category 1 --> Boolean
      This notification use-case considers a scenario where the users get notification about Bank holidays.

    Category 2, 3 --> Slider
      This notification use-case send notification to users who are interested in investments and APY. 
*/

  async startEventListener(simulate) {
        this.logInfo("EventListener function started!")
        
        const { contract, userAlice } = await this.initializeUser();
    
        // contract.on("Apy", async (apy, event) => {
        //     // call functions in channel
        //     this.logInfo("Calling ---> apyNotif()");
    
        //     this.apyNotif(userAlice, apy, simulate);    
        // })
    
        contract.on("Investments", async (investment, event) => {
            // call functions in channel
            this.logInfo("Calling ---> investmentNotif()");
    
            this.investmentNotif(userAlice, investment, simulate);    
        })
    
        contract.on("HolidayStatus", async (holiday, event) => {
            // call functions in channel
            this.logInfo("Calling ---> holidayNotif()");
    
            this.holidayNotif(userAlice, holiday, simulate);    
        })
   
  }

  // async apyNotif(userAlice, apy, simulate) {
  //   try {
  //     this.logInfo("Getting events ---> apyNotif");

  //   

  //   }catch (error) {
  //     this.logInfo("Error caused in the getInitiated function", error);
  //   }
  // }

  
  // This function is triggered with slider settings
  async investmentNotif(userAlice, investment, simulate) {
    try {
      this.logInfo("Getting events ---> investmentNotif");

    const payload = {
        notification: {
          title: 'Bank Investment Updates',
          body: 'Sending notification Bank Investment Updates category 3',
        },
        payload: {
          title: 'Bank Investment Updates',
          body: `Hi subscriber! This is to notify you that your bank's investment have reached ${investment}.`,
          cta: 'https://google.com/',
          embed: 'https://avatars.githubusercontent.com/u/64157541?s=200&v=4',
          // index of the notification the channel wants to trigger, in this for 3nd index which is for Slider type
          category: 3,
        },
      }
      // send notification with settings
      const notifRes = this.sendThroughNotifSettings(userAlice, payload);

      this.logInfo('Notification for Investment slider sent successful🟢', notifRes)

    }catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }
  
  async holidayNotif(userAlice, holiday, simulate) {
    try {
      this.logInfo("Getting events ---> holidayNotif");

      const payload = {
        notification: {
          title: 'Bank Holiday Status',
          body: 'Sending notification Bank Holiday Status category 1',
        },
        payload: {
          title: 'Bank Holiday Status',
          body: `Hi subscriber! This is to notify you that bank is ${holiday == true ? 'closed' : 'open'} today.`,
          cta: 'https://google.com/',
          embed: 'https://avatars.githubusercontent.com/u/64157541?s=200&v=4',
          // index of the notification the channel wants to trigger, in this for 1nd index which is for Boolean type
          category: 1,
        }
      }

      // send notification with settings
      const notifRes = this.sendThroughNotifSettings(userAlice, payload)

      this.logInfo('Notification for boolean sent successful🟢', notifRes)

    }catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }

  async sendThroughNotifSettings(userAlice, payload) {
    try {
      const notifRes = await userAlice.channel.send(['*'], payload);

      return notifRes
    } catch (error) {
      this.logInfo("ERROR🔴 from sendThroughNotifSettings: ", error);
    }
  }

  async initializeUser() {
    const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WEBSOCKET);
    const contract = new ethers.Contract(bankAddress, bankAbi, provider);

    const signer = new ethers.Wallet(
      process.env.PRIVATE_KEY, // Private key of the channel owner (or channel creation wallet)
        provider
    );

    // Initialize wallet user, pass 'prod' instead of 'staging' for mainnet apps
    const userAlice = await PushAPI.initialize(signer, { env: "staging" });

    return {contract, userAlice};
  }
}