## Showrunners X Notification Settings Integration

Notification settings allow users to customize their experience by opting in for notifications they're interested in. Bundling the power of Showrunners and Notification settings can help both the organization and their users to get custom notifications directly from events log.
Let's dive deep into how you can harness this functionality.

1. Install the Push SDK and Ethers (check the versions)
   `yarn add @pushprotocol/restapi@^1.4.30 ethers@^5.7`

2. Import the SDK and ethers in your {name}Channel.ts file
   `// Import the Push SDK
    import { PushAPI } from "@pushprotocol/restapi";
    import { ethers } from "ethers";`

3. In case you are using websockets, initialize the `userAlice` in your `startEventListener` function
    `const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_WEBSOCKET);`
    `const signer = new ethers.Wallet(
          process.env.PRIVATE_KEY, // Private key of the channel owner (or channel creation wallet)
            provider
    );`
   `// Initialize wallet user, pass 'prod' instead of 'staging' for mainnet apps
   const userAlice = await PushAPI.initialize(signer, { env: "staging" });`

4. Implement notification logic
   `async holidayNotif(userAlice, holiday, simulate) {`
    `try {`
      `this.logInfo("Getting events ---> holidayNotif");`

    `const notifResForBoolean = await userAlice.channel.send(['*'], {
        notification: {
          title: 'Bank Holiday Status',
          body: 'Sending notification Bank Holiday Status category 1',
        },
        payload: {
          title: 'Bank Holiday Status',
          body: `Hi subscriber! This is to notify you that bank is ${holiday == true ? 'closed' : 'open'} today.`,
          cta: 'https://google.com/',
          embed: 'https://avatars.githubusercontent.com/u/64157541?s=200&v=4',
          // index of the notification the channel wants to trigger, in this for 2nd index which is for Boolean type
          category: 1,
        },
      });`

      `this.logInfo('Notification for boolean sent successful🟢', notifResForBoolean)`

    `}catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }`
