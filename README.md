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

The PUSH Showrunners handles the channels created and maintaned by us. It also shows how easy it is to interact with the protocol to build highly customized notifications for your dApp, smart contracts or even centralized services.

---

## Installation and Set Up Guide

- Install docker 
- Clone the repo
``` 
git clone https://github.com/ethereum-push-notification-service/epns-showrunners-staging-v2.git
```
- Open the root folder in a terminal and enter 
```docker-compose up```. This initalises mongodb, redis and ipfs local instances
- Open the root folder in another terminal and enter
```
npm install
```
```
npm start
```

### To exit 
- To stop running the showrunners server, press ```Ctrl + C```
- To stop running the docker, press ```Ctrl + C``` and enter
```docker-compose down```

---

## Showrunner Channels


- To subscribe to channels, please visit our [Alpha dApp](https://app.epns.io)
- Currently notifications can be recieved through our [Google Play Alpha App](https://play.google.com/store/apps/details?id=io.epns.epns)
- The alpha protocol and product are working and are in ropsten network
- **Have an idea for protocol or product?** Awesome! get in touch by joining our [Telegram Group](https://t.me/epnsproject) or following us on [Twitter](https://twitter.com/epnsproject)

---

## Technical Details

Following definitions are used in the rest of the spec to refer to a particular category or service.
| Term | Description
| ------------- | ------------- |
| Showrunners | Showrunners are Channels on PUSH protocol notification protocol that are created and maintained by us |

### Tech Specs

The Showrunners run on node.js server and are modularized on the ideas and architecture of [Bulletproof NodeJS](https://github.com/santiq/bulletproof-nodejs), the essential features in the architeture are as follows:

- **config** defines all the necessary configuration
- **Jobs** is used to handle waking up different channels for various purpose. Very useful in sending notifications from channel at a specific interval
- **dbListener** can be used to listen to and trigger functions on DB changes, we have left the interpretation and an example over there for whoever wants to use them
- **showrunners** are the actual channels and contain logic which is required for them to construct notification according to their use cases
- **middlewares and routes** will probably not be active on your production server but are given to test the channel in development mode. for example: triggering functions using postman or similar service and seeing the response
- **database** the architecture has been changed from MongoDB to mysql to show how easy it is to have either of the database if required

### Credits

- [Bulletproof NodeJS](https://github.com/santiq/bulletproof-nodejs)

### External Services

We would need external services of:

- [Mongodb](https://www.mongodb.com/) - Primary Database : [Installation](https://docs.mongodb.com/manual/installation/) We would be using Mongodb Atlas
- [Redis](https://www.mongodb.com/) - Internal Cache : [Installation](https://redis.io/topics/quickstart)
- [Mongodb Atlas](https://www.mongodb.com/cloud/atlas)

For local ease of development, we make use of [Docker](https://docs.docker.com/get-docker/).

---

## Resources
- **[Website](https://push.org)** To checkout our Product.
- **[Docs](https://docs.push.org/developers/)** For comprehensive documentation.
- **[Blog](https://medium.com/push-protocol)** To learn more about our partners, new launches, etc.
- **[Discord](https://discord.gg/pushprotocol)** for support and discussions with the community and the team.
- **[GitHub](https://github.com/ethereum-push-notification-service)** for source code, project board, issues, and pull requests.
- **[Twitter](https://twitter.com/pushprotocol)** for the latest updates on the product and published blogs.

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
Check out our License <a href='https://github.com/sumithprabhu/push-showrunners-framework/blob/main/license-v1.md'>HERE </a>

