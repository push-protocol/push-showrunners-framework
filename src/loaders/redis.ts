const redis = require('async-redis');
import config from '../config';

const ReddisInstance = redis.createClient({ 
        url: config.REDIS_URL,
        password: config.REDIS_AUTH,   
});

export default ReddisInstance;
