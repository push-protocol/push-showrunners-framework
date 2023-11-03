## Showrunners X Notification Settings Integration🔔

Notification settings allow users to customize their experience by opting in for notifications they're interested in. Bundling the power of Showrunners and Notification settings can help both the organization and their users to get custom notifications directly from the chain.
Let's dive deep into how you can harness this feature.

## Installation

Open the Showrunners and install with yarn

```bash
  yarn add @pushprotocol/restapi@^1.4.30 ethers@^5.7
```

## Implementation
Add imports to the [name]Channel.ts

```bash
    import { PushAPI } from "@pushprotocol/restapi";
    import { ethers } from "ethers";
```

In case you are using websockets, initialize the `userAlice` in `startEventListener`

```bash
    const provider = new ethers.providers.WebSocketProvider(WEBSOCKET_URL_HERE);
    const signer = new ethers.Wallet(
          PRIVATE_KEY_HERE, // Private key of the channel owner (or channel creation wallet)
            provider
        );
    const userAlice = await PushAPI.initialize(signer, { env: "staging" });
```

Trigger notification using the Push SDK 

```bash
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
          // index of the notification the channel wants to trigger, in this for 1st index which is for Boolean type
          category: 1,
        },
      });

      this.logInfo('Notification for boolean sent successful🟢', notifResForBoolean)

    }catch (error) {
      this.logInfo("Error caused in the holidayNotif function", error);
    }
  }
```

NOTE: 
1. The `category` specifies the type of notification you want to trigger.
2. `['*']` conveys the list of all addresses that optted in. 
