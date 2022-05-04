import moment from 'moment';
import { Service, Inject } from 'typedi';
import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import { Logger } from 'winston';
import ookiLoanPoolABI from './ooki_loanPool.json';
import erc20ABI from './erc20.json';
import ookiSettings from './ookiSettings.json';
const bent = require('bent'); // Download library

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
const DEBUG = true; //set to false to turn of logging
const CONTRACT_DEFAULTS = {
  loanStart: 0, //when paginating loans, always start from the first one of index
  isLender: false, // we are dealing with only borrowers not lenders
  loanType: 0, //default to 0 to get all types of loans All(0), Margin(1), NonMargin(2)
  unsafeOnly: false, //if this is set to true, it would return only loans ready for liquidation, we hope to warn them before it gets to this stage,
  tenorTreshold: 3, // number of days from loan tenor end we would want to alert them. i.e 3 days before their loan expires
  liquidationTreshold: 10, //percentage we would want to notify them when their current margin is within 10% above the minimum margin allowed before liquidation
  dateUnit: 'days', //the unit which we want to to compare date differences.
};
const CUSTOMIZABLE_DEFAULTS = {
  toEth: num => Number((num / 10 ** 18).toFixed(3)), // convert a number from eth to unit 3.dp
  dateFormat: 'DD-MM-YY',
  precision: 3, //number of decimal places
  loansCTA: 'https://ooki.com/borrow/user-loans',
  tradeCTA: 'https://ooki.com/borrow/user-loans',
};

const contractABI = {
  erc20DeployedContractABI: JSON.stringify(erc20ABI),
  ookiLoanDeployedContractABI: JSON.stringify(ookiLoanPoolABI),
};

const getJSON = bent('json');

@Service()
export default class OokiChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: NETWORK_TO_MONITOR,
      dirname: __dirname,
      name: 'Ooki',
      url: 'https://hello.ooki.com/',
      useOffChain: true,
      address:"0x9B43a385E08EE3e4b402D4312dABD11296d09E93"
    });
  }

  public async sendMessageToContract(simulate) {
    try {
      const sdk = await this.getSdk();

      //  Overide logic if need be
      const logicOverride =
        typeof simulate == 'object'
          ? simulate.hasOwnProperty('logicOverride')
            ? simulate.hasOwnProperty('logicOverride')
            : false
          : false;
      let subscribers =
        logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty('addressesWithLoans')
          ? simulate.logicOverride.addressesWithLoans
          : false;
      //  -- End Override logic
      const txns = [];
      if (!subscribers) {
        subscribers = await sdk.getSubscribedUsers();
        this.logInfo(`[OOKI sendMessageToContracts] - gotten ${subscribers} from channel...`);
      }
      // initialise the ooki contract
      const isLender = false; //this variable would be false since we are concerned with 'borrowers' instead of lenders
      const ookiContract = await sdk.getContract(
        ookiSettings.ookiLoanContract,
        contractABI.ookiLoanDeployedContractABI,
      );
      // loop through all subscribers and get those with loans
      this.logInfo(`[OOKI sendMessageToContracts] - getting all the subscribers and the number of loans they have`);
      const subscribersAndLoans = await Promise.all(
        subscribers.map(async subscriber => {
          const loanCountString = await ookiContract.contract.functions.getUserLoansCount(subscriber, isLender);
          const loanCount = parseInt(loanCountString.toString());
          return { loanCount, subscriber };
        }),
      );
      // filter out subscribers without loans
      const subscribersWithLoans = subscribersAndLoans.filter(({ loanCount }) => loanCount);

      // for each subscriber get their loan details into a single array
      // for all these subscribers we then get their loans
      this.logInfo(`[OOKI sendMessageToContracts] - filtering out subscribers with no loans`);
      const allSubscribersLoans = await Promise.all(
        subscribersWithLoans.map(async oneSubscriber => {
          const { loanCount, subscriber }: any = oneSubscriber;
          // using the details above get all the active laons the user has
          const [userLoan] = await ookiContract.contract.functions.getUserLoans(
            subscriber,
            CONTRACT_DEFAULTS.loanStart,
            loanCount,
            CONTRACT_DEFAULTS.loanType,
            isLender,
            CONTRACT_DEFAULTS.unsafeOnly,
          );
          // extract information from loan
          const extractedLoanInfo = userLoan.map(oneLoan => {
            const { endTimestamp, startMargin, currentMargin, maintenanceMargin, loanToken } = oneLoan;
            // extract details which enable us to send notifications if some criteria is met
            return {
              endTimestamp: endTimestamp.toString(),
              startMargin: startMargin.toString(),
              currentMargin: currentMargin.toString(),
              maintainanceMargin: maintenanceMargin.toString(),
              subscriber,
              loanToken,
            };
          });

          return extractedLoanInfo;
        }),
      );

      // the above gives us an array of arrays, flatten it to prevent multiple nested loops
      const allLoans = [].concat.apply([], allSubscribersLoans);

      // go through all the loans and if they meet any of our criterias then we send the notification
      this.logInfo(`[OOKI sendMessageToContracts] - selecting customers who meet our conditions for notifications`);
      await Promise.all(
        allLoans.map(async oneLoan => {
          const { endTimestamp, startMargin, currentMargin, maintainanceMargin, subscriber, loanToken } = oneLoan;
          // get details on the loan token
          const tokenContract = await sdk.getContract(loanToken, contractABI.erc20DeployedContractABI);
          const [loanTokenName] = await tokenContract.contract.functions.name();
          const [loanTokenSymbol] = await tokenContract.contract.functions.symbol();

          const loanTokenPrice = await this.getPrice(loanTokenSymbol, undefined);
          // convert the timeStamp to date and find how many days it is away from today
          const parsedEndDate = moment(parseInt(endTimestamp) * 1000);
          const dateDifference = parsedEndDate.diff(moment(), CONTRACT_DEFAULTS.dateUnit as any);
          // check if the currentMargin is within 10% above the mainatanance margin
          const upperBoundary =
            parseInt(maintainanceMargin) + (parseInt(maintainanceMargin) * CONTRACT_DEFAULTS.liquidationTreshold) / 100;
          // calculate current prices
          const currentMarginPrice = loanTokenPrice * CUSTOMIZABLE_DEFAULTS.toEth(currentMargin); // convert the margins to units;
          const mainatananceMarginPrice = loanTokenPrice * CUSTOMIZABLE_DEFAULTS.toEth(maintainanceMargin); //convert the margins to units;
          // define the conditions for sending notifications
          const belowBoundary = upperBoundary > currentMargin; // this would be true if the current margin is less that 10 percent greater than the maintainance margin
          const warningDate = CONTRACT_DEFAULTS.tenorTreshold > dateDifference; // this would be true if the loan is within x days of its expiration date

          this.logInfo(`warningDate ; ${warningDate}, belowBoundary : ${belowBoundary}`)
          if (!belowBoundary) {
            // send them a notification that they are close to liquidation
            this.logInfo(
              `[OOKI sendMessageToContracts] - The Loan of ${loanTokenName} of subscriber :${subscriber},  is below treshold with current margin of :${currentMarginPrice} & maintainance margin:${mainatananceMarginPrice}`,
            );
            const title = `Ooki Loan of ${loanTokenName} is approaching liquidation`;
            const body = `Your loan of ${loanTokenName} is approaching liquidation please fund your account`;
            const payloadTitle = `Ooki Loan of ${loanTokenName} is approaching liquidation`;
            const payloadMsg = `Your loan of ${loanTokenName} is approaching liquidation please fund your account.\n\n[d: Current Margin Price]: $${currentMarginPrice.toFixed(
              2,
            )}\n\n[s: Maintainance Margin Price]: $${mainatananceMarginPrice.toFixed(2)} [timestamp: ${Math.floor(
              +new Date() / 1000,
            )}]`;
            const cta = CUSTOMIZABLE_DEFAULTS.tradeCTA;

            const notificationType = 3;
            const tx = await this.sendNotification({
              recipient: subscriber,
              title: title,
              message: body,
              payloadMsg: payloadMsg,
              payloadTitle: payloadTitle,
              notificationType: notificationType,
              cta: CUSTOMIZABLE_DEFAULTS.tradeCTA,
              simulate: simulate,
              image: null,
            });

            txns.push(tx);
          }
          if (warningDate) {
            this.logInfo(
              `[Ooki sendMessageToContracts] - The Loan of ${loanTokenName} of subscriber :${subscriber},  is ${dateDifference} days from expiration`,
            );
            const title = `Ooki Loan of ${loanTokenName} is close to it's tenor end.`;
            const body = `Your Loan of ${loanTokenName} from Ooki is [s: ${dateDifference} Days] away from its due date\n\n[d: Due Date]: ${parsedEndDate.format(
              CUSTOMIZABLE_DEFAULTS.dateFormat,
            )}`;
            const payloadTitle = `Ooki Loan of ${loanTokenName} close to it's tenor end.`;
            const payloadMsg = `Your Loan of ${loanTokenName} from Ooki is [s: ${dateDifference} Days away from its due date]`;

            const notificationType = 3;
            const tx = await this.sendNotification({
              recipient: subscriber,
              title: title,
              message: body,
              payloadTitle: payloadTitle,
              payloadMsg: payloadMsg,
              notificationType: notificationType,
              cta: CUSTOMIZABLE_DEFAULTS.loansCTA,
              simulate: simulate,
              image: null,
            });
            // to remove after testing
            this.logInfo(`[OOKI sendMessageToContracts] - sent notification to ${subscriber}`);
            txns.push(tx);
          }
        }),
      );

      const response = {
        success: 'success',
        data: txns,
      };
      return response;
    } catch (err) {
      const response = {
        error: err.message,
        data: [],
      };
      return response;
    }
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

    const cmcroute = 'v1/cryptocurrency/quotes/latest';
    const pollURL = `${config.cmcEndpoint}${cmcroute}?symbol=${tokenSymbol}&CMC_PRO_API_KEY=${config.cmcAPIKey}`;
    this.logInfo(`[OOKI getPrice] obtaining prices from CMC API`);
    const response = await getJSON(pollURL);
    const data = response.data[tokenSymbol];
    const price = Number(data.quote.USD.price.toFixed(CUSTOMIZABLE_DEFAULTS.precision));
    this.logInfo(`[OOKI getPrice] obtained prices for token ${tokenSymbol} as ${price}`);
    return price;
  }
}
