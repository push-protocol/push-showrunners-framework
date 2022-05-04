import { Service, Inject } from 'typedi';
import podsSettings from './podsSettings.json';
import config, { defaultSdkSettings } from '../../config';
import { PositionWithDependenciesFragment } from './fragments';

import moment from 'moment';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';

const bent = require('bent'); // Download library
const getJSON = bent('json');
const gr = require('graphql-request');
const { request, gql } = gr;

const parseWrappedTokens = (tokenName: string) => {
  // get a list of common token names
  const COMMON_NAMES = ['USDC', 'USDT', 'ETH', 'BTC', 'DAI'];
  const A_TOKEN_INITIALS = 'a';
  const W_TOKENS_INITIALS = 'w';
  // check for a tokens
  // check if its a popular token
  const foundSimilar = COMMON_NAMES.find(oneName => tokenName.toUpperCase().includes(oneName));
  if (foundSimilar) {
    return foundSimilar;
  }
  if (tokenName.toLowerCase().startsWith(A_TOKEN_INITIALS) || tokenName.toLowerCase().startsWith(W_TOKENS_INITIALS)) {
    return tokenName.slice(1, tokenName.length).toUpperCase();
  }
  return tokenName.toUpperCase();
};
@Service()
export default class PodsChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Pods',
      url: 'https://www.pods.finance/',
      useOffChain: true,
      address:'0xb4F88Ad000A53638F203dcA2C39828a58057d53c'
    });
  }

  public async getPrice(symbol, simulate) {
    // to get the current price of a token by its symbol
    //  Overide logic if need be
    const logicOverride =
      typeof simulate == 'object'
        ? simulate.hasOwnProperty('logicOverride')
          ? simulate.hasOwnProperty('logicOverride')
          : false
        : false;
    const tokenSymbol =
      logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty('symbol')
        ? simulate.logicOverride.symbol
        : symbol;
    //  -- End Override logic
    try {
      const cmcroute = 'v1/cryptocurrency/quotes/latest';
      const pollURL = `${config.cmcEndpoint}${cmcroute}?symbol=${tokenSymbol}&CMC_PRO_API_KEY=${config.cmcAPIKey}`;
      const response = await getJSON(pollURL);
      const data = response.data[tokenSymbol];
      const price = Number(data.quote.USD.price.toFixed(2));
      return price;
    } catch (err) {
      // we cant fetch the price in usd of the underlying asset
      console.log('[podsChannel => getPrice] error:', err.message);
      return 0;
    }
  }

  /**
   * Use this function to determine which positions are owned by the user in question
   * @param userAddress
   * @param simulate
   * @returns
   */
  public async getUserPositions(userAddress: any, simulate: any) {
    const addressToBeUsed = simulate?.logicOverride?.userAddress ?? userAddress;

    const GET_USER_POSITION = gql`
            query{
                positions(
                where: {
                    user: "${addressToBeUsed}"
                    option_not_in: ["0x0000000000000000000000000000000000000000"]
                }
                first: 50
                orderBy: expiration
                orderDirection: desc
                ) {
                ...PositionWithDependenciesFragment
                }
            }
            ${PositionWithDependenciesFragment}
        `;

    const data = await request(podsSettings.PODS_URL_GRAPH, GET_USER_POSITION);
    return data ? data.positions : [];
  }

  public async sendMessageToContract(simulate) {
    this.logInfo(`SendMessageToContract Triggered`);
    const logicOverride = simulate?.logicOverride?.mode ?? false;

    const overrideDays = logicOverride && simulate.logicOverride.overrideDays;
    const notificationType = 3;

    const CURRENT_DATE = moment();
    let users: any;

    const sdk = await this.getSdk();
    // get all subscribers to a channel
    if (logicOverride && simulate.logicOverride.hasOwnProperty('addressesWithPositions')) {
      users = [...simulate.logicOverride.addressesWithPositions];
    } else {
      users = await sdk.getSubscribedUsers();
    }

    const userPositionsPromises = users.map(async oneUser => {
      // find out all the positions for each subscriber
      this.logInfo(`User Address : ${oneUser}`)
      const userPositions = await this.getUserPositions(oneUser, null);
      // go through all of the positions and send a notification for each which meet our criteria
      const oneUserPositionPromises = userPositions.map(async userPosition => {
        const results = [];
        const expirationDate = moment(new Date(userPosition.expiration * 1000));
        const datediff = expirationDate.diff(CURRENT_DATE, 'days');
        // check for expiry
        // check for underlying price
        // get the symbold of the current assets
        const strikePrice = +userPosition.option.strikePrice / 10 ** +userPosition.option.strikeAssetDecimals;
        const strikeAssetSymbol = parseWrappedTokens(userPosition.option.strikeAssetSymbol);
        const underlyingAssetSymbol = parseWrappedTokens(userPosition.option.underlyingAssetSymbol);

        // get the market price of the eunderlying assets in dollars
        const strikeAssetUnitPrice = await this.getPrice(strikeAssetSymbol, {});
        const underlyingAssetUnitPrice = await this.getPrice(underlyingAssetSymbol, {});

        const exercisePrice = strikeAssetUnitPrice * strikePrice;
        const percentageDiff = +(
          (Math.abs(exercisePrice - underlyingAssetUnitPrice) * 100) /
          underlyingAssetUnitPrice
        ).toFixed(1);

        // option type 0 for Put, 1 for Call
        const optionType = userPosition.option.type === 0 ? 'Put' : 'Call';

        if (percentageDiff < podsSettings.PRICE_TRESHOLD) {
          const payloadTitle = `PODS ${optionType} Options approaching strike price`;
          const shortMessage = `The price of ${userPosition.option.underlyingAssetSymbol} for your options is close to its strike price`;
          const payloadMsg = `Your pods ${optionType} option with underlying asset [b: ${
            userPosition.option.underlyingAssetSymbol
          }] is approaching its strike price\n\nCurrent Asset Price: [d: $${underlyingAssetUnitPrice.toLocaleString()}]\nStrike Price: [s: $${exercisePrice.toLocaleString()}] [timestamp: ${Math.floor(
            +new Date() / 1000,
          )}]`;

          this.log(simulate);
          const tx = await this.sendNotification({
            recipient: oneUser,
            payloadTitle: payloadTitle,
            message: shortMessage,
            payloadMsg: payloadMsg,
            image: null,
            notificationType: notificationType,
            cta: podsSettings.CTA,
            simulate: simulate,
            title: payloadTitle,
          });
          
          // send the notification
          results.push(tx);
        }

        if (datediff < podsSettings.DATE_DIFFERENCE_TOLERANCE || overrideDays) {
          const payloadTitle = `PODS ${optionType} Options expiring`;
          const shortMessage = `Your option with underlying the asset ${userPosition.option.underlyingAssetSymbol} is close to expiring`;
          const payloadMsg = `Your option with underlying the asset [b: ${
            userPosition.option.underlyingAssetSymbol
          }]  from Pods Finance is [s: ${overrideDays ||
            datediff} days away from its expiry date]. [timestamp: ${Math.floor(+new Date() / 1000)}]`;

          this.log(simulate);
          const tx = await this.sendNotification({
            recipient: oneUser,
            payloadTitle: payloadTitle,
            message: shortMessage,
            payloadMsg: payloadMsg,
            image: null,
            notificationType: notificationType,
            cta: podsSettings.CTA,
            simulate: simulate,
            title: payloadTitle,
          });
          // send the notification
          results.push(tx);
        }
        return results;

        // get the current price of strike asset
      });
      const allSent = await Promise.all(oneUserPositionPromises);
      return allSent.filter(Boolean);
    });

    const positionsSent = await Promise.all(userPositionsPromises);
    // check the positions with an expiry date of soon
    // send them a notification
    return positionsSent.filter(Boolean);
  }
}
