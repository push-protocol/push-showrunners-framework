import { Service, Inject } from 'typedi';
import config from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import { request, gql } from 'graphql-request';
import { PushAPI } from "@pushprotocol/restapi";
 
import { ethers } from "ethers";
import bank from "./bank.json";

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
*/

  async startEventListener(simulate) {
        this.logInfo("EventListener function started!")
        
        const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WEBSOCKET);
        const contract = new ethers.Contract(bankAddress, bankAbi, provider);

        const signer = new ethers.Wallet(
          process.env.PRIVATE_KEY, // Arv test
            provider
        );

        // Initialize wallet user, pass 'prod' instead of 'staging' for mainnet apps
        const userAlice = await PushAPI.initialize(signer, { env: "staging" });
    
        // contract.on("Apy", async (apy, event) => {
        //     // call functions in channel
        //     this.logInfo("Calling ---> apyNotif()");
        //     // const subscribers = await this.getChannelSubscribers();
    
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
    
            // if (subscribers.includes(receiver)) this.getTxApproved(sender, receiver, amount, chain, simulate);    
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


  // usecase 1.3
  
  async investmentNotif(userAlice, investment, simulate) {
    try {
      this.logInfo("Getting events ---> investmentNotif");

    const notifResForSliderI = await userAlice.channel.send(['*'], {
        notification: {
          title: 'Bank Investment Updates',
          body: 'Sending notification Bank Investment Updates category 3',
        },
        payload: {
          title: 'Bank Investment Updates',
          body: `Hi subscriber! This is to notify you that your bank's investment have reached ${investment}.`,
          cta: 'https://google.com/',
          embed: 'https://avatars.githubusercontent.com/u/64157541?s=200&v=4',
          // index of the notification the channel wants to trigger, in this for 2nd index which is for Setting2 type
          category: 3,
        },
      });

      this.logInfo('Notification for Investment slider sent successful🟢', notifResForSliderI)

    }catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }
  
  async holidayNotif(userAlice, holiday, simulate) {
    try {
      this.logInfo("Getting events ---> holidayNotif");

    const notifResForBoolean = await userAlice.channel.send(['*'], {
        notification: {
          title: 'Bank Holiday Status',
          body: 'Sending notification Bank Holiday Status category 1',
        },
        payload: {
          title: 'Bank Holiday Status',
          body: `Hi subscriber! This is to notify you that bank is ${holiday == true ? 'closed' : 'open'} today.`,
          cta: 'https://google.com/',
          embed: 'https://avatars.githubusercontent.com/u/64157541?s=200&v=4',
          // index of the notification the channel wants to trigger, in this for 2nd index which is for Setting2 type
          category: 1,
        },
      });

      this.logInfo('Notification for boolean sent successful🟢', notifResForBoolean)

    }catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }
}