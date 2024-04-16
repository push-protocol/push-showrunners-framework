const redis = require('async-redis');
import config from '../config';

const ReddisInstance = redis.createClient({ 
        url: config.redisURL,
        password: config.redisAuth
});

export default ReddisInstance;
