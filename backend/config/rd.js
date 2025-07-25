import redis from 'redis';

// Create a Redis client
const rd = redis.createClient({
    socket: {
        host: '127.0.0.1', // Redis server host
        port: 6379 // Default Redis port
    }
}); 

// Connect to Redis
(async () => {
    try {
        await rd.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Redis connection error:', error);
    }
})();

export default rd;