const { createClient } = require('redis');

const redisClient = createClient({
    url: 'redis://redis:6379',
    socket: {
        reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt ${retries}`);
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on('error', err => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));
redisClient.on('end', () => console.log('Redis Client Connection Ended'));

const connectRedis = async () => {
    try {
        console.log('Attempting to connect to Redis...');
        await redisClient.connect();
        console.log('Testing Redis connection...');
        await redisClient.set('test', 'working');
        const testResult = await redisClient.get('test');
        console.log('Redis connection test:', testResult === 'working' ? 'SUCCESS' : 'FAILED');
    } catch (err) {
        console.error('Redis connection error:', err);
        console.error('WARNING: Redis failed to connect! Caching will not work!');
    }
};

connectRedis();

module.exports = redisClient; 