const redis = require('async-redis');
import config from '../config';

const ReddisInstance = redis.createClient({ 
        url: process.env.REDIS_URL,
        password: process.env.REDIS_AUTH
});

export default ReddisInstance;
