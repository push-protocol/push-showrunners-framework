<h1 align="center">  
    <a href="https://push.org/#gh-light-mode-only">
    <img width='20%' height='10%' src="https://res.cloudinary.com/drdjegqln/image/upload/v1686227557/Push-Logo-Standard-Dark_xap7z5.png">
    </a>
    <a href="https://push.org/#gh-dark-mode-only">
    <img width='20%' height='10%' src="https://res.cloudinary.com/drdjegqln/image/upload/v1686227558/Push-Logo-Standard-White_dlvapc.png">
    </a>
</h1>
 
<p align="center">
  <i align="center">Push Protocol is a web3 communication network, enabling cross-chain notifications, messaging, video, and NFT chat for dapps, wallets, and services.🚀</i>
</p>

<h4 align="center">

  <a href="https://discord.gg/pushprotocol">
    <img src="https://img.shields.io/badge/discord-7289da.svg?style=flat-square" alt="discord">
  </a>
  <a href="https://twitter.com/pushprotocol">
    <img src="https://img.shields.io/badge/twitter-18a1d6.svg?style=flat-square" alt="twitter">
  </a>
  <a href="https://www.youtube.com/@pushprotocol">
    <img src="https://img.shields.io/badge/youtube-d95652.svg?style=flat-square&" alt="youtube">
  </a>
</h4>


# PUSH Showrunners (Server)

The showrunners framework is a scaffold that developers can use to build out notifications for their use cases. Showrunners framework provides the tools and helpers required for constructing the payload and sending the notification using the Push protocol infrastructure. 

---

## Installation and Set Up Guide

- Install docker 
- Clone the repo
``` 
git clone https://github.com/push-protocol/push-showrunners-framework
```
- To make it easier to use, we will be using Docker. You can initialize it using the code below code , but if looking for a manual setup then [Refer this](#external-services).
```
docker-compose up
```
- Open the root folder in another terminal and enter
```
yarn install
```
```
yarn start
```

### To exit 
- To stop running the showrunners server, press ```Ctrl + C```
- To stop running the docker, press ```Ctrl + C``` and enter
```docker-compose down```

---
## Channel Structure 
Before we dive into an example ,Let's understand the requirements for the folder structure inside the src/showrunners folder and how you can use them to quickly refine / debug / deploy your channels.

Each folder inside ```src/showrunners``` is treated as their own channel. Showrunners is designed to be a plug and play solution for your channel which means that each of the folders designated filenames are used to add-on various functionalities.

1. channelChannel.js [.ts] (Mandatory)
    - Example: helloWorldChannel.js
    - This file contains all the logic functions of your channel, it can for instance have a way to poll all opted in users of your channel and based on certain conditions that are met, fire notifications out.
1. channelKeys.json (Mandatory)
    - Example: helloWorldKeys.json
    - This file contains all your private keys that you either belong to the channel you created or have authorized the wallets to send notification on your channel's behalf.
1. channelRoutes.js [.ts]
    - Example: helloWorldRoutes.js
    - This file contains the routes that you will enable to ensure you are able to manually trigger notification or any other logic points in your channelChannel.js [.ts]
    - You will ideally use the route of this files in postman to trigger logic functions / test them out. 
1. channelJobs.js [.ts]
    - Example: helloWorldJobs.js
    - This file contains your cron jobs to trigger logic points in your channelChannel.js [.ts]
    - The file is based on node-schedule and can handle a wide variety of automated cron jobs to enable sending wide array of notifications based on triggers.
1. channelAWSSNS.js[.ts]
    - Example: helloWorldAWSSNS.ts
    - This file contains the webhook helpers and handle the logic points for consuming a webhook.
    - This file is based on AWS-SNS and can handle the variety of logics for consuming webhook to enable sending wide array of notifications based on webhook triggers.

---

## Examples :

Now lets have a quick tour into example and understand How to actually run a Showrunner framework over a demo HelloWorld channel

[Hello World Example](https://docs.push.org/developers/developer-tooling/showrunners-framework/hello-world-channel)

For more examples [Refer this](https://github.com/push-protocol/push-showrunners-framework/tree/main/src/sample_showrunners).

---

## Technical Details

<!-- Following definitions are used in the rest of the spec to refer to a particular category or service.
| Term | Description
| ------------- | ------------- |
| Showrunners | Showrunners are Channels on PUSH protocol notification protocol that are created and maintained by us | -->

<!-- ### Tech Specs

The Showrunners run on node.js server and are modularized on the ideas and architecture of [Bulletproof NodeJS](https://github.com/santiq/bulletproof-nodejs), the essential features in the architeture are as follows:

- **config** defines all the necessary configuration
- **Jobs** is used to handle waking up different channels for various purpose. Very useful in sending notifications from channel at a specific interval
- **dbListener** can be used to listen to and trigger functions on DB changes, we have left the interpretation and an example over there for whoever wants to use them
- **showrunners** are the actual channels and contain logic which is required for them to construct notification according to their use cases
- **middlewares and routes** will probably not be active on your production server but are given to test the channel in development mode. for example: triggering functions using postman or similar service and seeing the response
- **database** the architecture has been changed from MongoDB to mysql to show how easy it is to have either of the database if required

### Credits

- [Bulletproof NodeJS](https://github.com/santiq/bulletproof-nodejs) -->

## External Services

We would need external services of:

- [Mongodb](https://www.mongodb.com/) - Primary Database : [Installation](https://docs.mongodb.com/manual/installation/) We would be using Mongodb Atlas
- [Redis](https://www.mongodb.com/) - Internal Cache : [Installation](https://redis.io/topics/quickstart)
- [Mongodb Atlas](https://www.mongodb.com/cloud/atlas)

For local ease of development, we make use of [Docker](https://docs.docker.com/get-docker/).

---

## Contributing

Push Protocol is an open source Project. We firmly believe in a completely transparent development process and value any contributions. We would love to have you as a member of the community, whether you are assisting us in bug fixes, suggesting new features, enhancing our documentation, or simply spreading the word. 

- Bug Report: Please create a bug report if you encounter any errors or problems while utilising the Push Protocol.
- Feature Request: Please submit a feature request if you have an idea or discover a capability that would make development simpler and more reliable.
- Documentation Request: If you're reading the Push documentation and believe that we're missing something, please create a docs request.

Not sure where to start? Join our discord and we will help you get started!


<a href="https://discord.gg/pushprotocol" title="Join Our Community"><img src="https://www.freepnglogos.com/uploads/discord-logo-png/playerunknown-battlegrounds-bgparty-15.png" width="200" alt="Discord" /></a>

---

## License
Check out our License <a href='https://github.com/push-protocol/push-showrunners-framework/blob/main/license-v1.md'>HERE </a>

