import { Inject, Service } from 'typedi';
import { Logger } from 'winston';
import config, { defaultSdkSettings } from '../../config';
import { EPNSChannel } from '../../helpers/epnschannel';
import axios from 'axios';
import fabweltSettings from './fabweltSettings.json';
interface Tournament {
  id: string;
  tournament_time: string;
  frequency: string;
  day: string;
  map: string;
  game_type: string;
  min_player_allowed: string;
  max_player_allowed: string;
  fee: string;
  house_perc: string;
  tournament_duration: String;
  waiting_room_time: string;
  game_goal: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const COMPARE_TIME_IN_SECONDS = 10 * 60;
@Service()
export default class FabweltChannel extends EPNSChannel {
  constructor(@Inject('logger') public logger: Logger) {
    super(logger, {
      sdkSettings: {
        epnsCoreSettings: defaultSdkSettings.epnsCoreSettings,
        epnsCommunicatorSettings: defaultSdkSettings.epnsCommunicatorSettings,
        networkSettings: defaultSdkSettings.networkSettings,
      },
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: 'Fabwelt',
      url: 'https://www.fabwelt.com/',
      useOffChain: true,
      address: '0x361Cb6BE977d0113A33914A8f952Ced95747F793',
    });
  }

  async tournamentAlertTask(simulate) {
    const tournaments = await this.fetchTournaments();
    for (const tournament of tournaments) {
      let dt = new Date();
      let parsedTime = tournament.tournament_time.split(':');
      let hours = parseInt(parsedTime[0]);
      let minutes = parseInt(parsedTime[1]);
      dt.setUTCHours(hours);
      dt.setUTCMinutes(minutes);
      dt.setUTCSeconds(0);
      const ts = Math.floor(Date.now() / 1000);
      const dtTs = Math.floor((dt as any) / 1000);
      const secondsToStart = dtTs - ts;
      
      if (secondsToStart <= COMPARE_TIME_IN_SECONDS && secondsToStart >= 0) {
        this.logInfo(`Tournament starting soon`);

        const message = `Tournament #${tournament.id} starting soon`;
        const payloadMessage = `Tournament [d:#${tournament.id}] starting soon\n\n[b:Game Type] : ${tournament.game_type}\n[b:Map] : ${tournament.map}\n[b:Fee] : ${tournament.fee}\n[b:Goal]: ${tournament.game_goal}`;
        const title = `Tournament #${tournament.id} starting soon`;
        const cta = `https://arsenal.fabwelt.com/`;
        await this.sendNotification({
          image: null,
          message: message,
          title: title,
          payloadTitle: title,
          payloadMsg: payloadMessage,
          notificationType: 1,
          recipient: this.channelAddress,
          simulate: simulate,
          cta: cta,
        });
      }
    }
  }

  async fetchTournaments(): Promise<Tournament[]> {
    this.logInfo(`Fetching tournament data`);
    const res = await axios.get(fabweltSettings.tournamentEndPoint);
    // Create a buffer from the string
    let bufferObj = Buffer.from(res?.data, 'base64');

    // Encode the Buffer as a utf8 string
    let decodedString = bufferObj.toString('utf8');
    const data = JSON.parse(decodedString);
 
    return data;
  }
}
