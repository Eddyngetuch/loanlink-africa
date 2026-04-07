const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect().then(() => console.log('Redis connected'));

module.exports = client;