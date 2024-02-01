import AaveChannel from "./aaveChannel";
import fakeCache from './mockCache';
import Container from 'typedi';

// mock logger object
const mockLogger: any = {
  info: (...___: any[]) => true,
  debug: (...___: any[]) => true,
  error: (...value: any[]) => console.log('test', ...value),
};

const aave = new AaveChannel(mockLogger as any,fakeCache);
describe('Liquidation Factors', () => {

  beforeAll(() => {
    Container.set('cached', fakeCache);
  });

  it('Can check Health factor between 0 to 3', async() => {
    let i=0;
    while(i<=3){
      expect(await aave.testLogic(i)).toBe(true);
      i = i+0.1;
    }
  });

  it('It checks Health factor above 3', async() => {
    let i=3.1;
    while(i<=4){
      expect(await aave.testLogic(i)).toBe(false);
      i = i+0.1;
    }
  });
});
