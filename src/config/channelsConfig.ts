import fs from 'fs';
import cryptoHelper from '../helpers/cryptoHelper';
import LoggerInstance from '../loaders/logger';
const utils = require('../helpers/utilsHelper');

// Loads wallejs using the private keys present in each folder
// Scans for channelNameKeys.js file in the channel directory 
// Loads the private key and add the keys to channlKeys
const channelWallejs = function loadShowrunnersWallejs() {
  LoggerInstance.info(`    -- Checking and Loading Dynamic Channel Keys...`);
  const channelFolderPath = `${__dirname}/../showrunners/`;
  const directories = utils.getDirectories(channelFolderPath);

  let channelKeys = {};
  let keys = {};

  if (directories.length == 0) {
    LoggerInstance.info(
      `     ❌  showrunners doesn't have any channel folder in src/showrunners! Check docs.epns.io to see how to setup showrunners properly!`,
    );
    process.exit(1);
  }

  for (const channel of directories) {
        const absPath = `${channelFolderPath}${channel}/${channel}Keys.js`;
    if (fs.existsSync(absPath)) {
      const object = require(absPath);
      let count = 1;

      channelKeys[`${channel}`] = {};

      for (const [key, value] of Object.entries(object.keys)) {
        // check and decide old standard or not
        const isOldStandard = typeof value === 'string' || value instanceof String ? true : false;
        const newValue: any = value;
        const pkey = isOldStandard ? newValue : newValue.PK;

        const result = cryptoHelper.checkPrivateKeyValidity(pkey);

        if (result) {
          channelKeys[`${channel}`][`wallet${count}`] = value;
          count++;
        } else {
          LoggerInstance.info(`         ⚠️  ${key} -> ${value} is invalid private key, skipped`);
        }
      }

      if (Object.keys(channelKeys[`${channel}`]).length) {
        LoggerInstance.info(`     ✔️  ${channel} Loaded ${Object.keys(channelKeys[`${channel}`]).length} Wallet(s)!`);
      } else {
        LoggerInstance.info(
          `     ❌  ${channel} has no wallejs attached to them... aborting! Check ${channel}Keys.js!!!`,
        );
        process.exit(1);
      }
    } else {
      LoggerInstance.info(
        `     ❌  ${channel}Keys.js does not exisjs. aborting! Create ${channel}Keys.js and add one wallet to it!!!`,
      );
      process.exit(1);
    }
  }

  return channelKeys;
};

export default channelWallejs;
