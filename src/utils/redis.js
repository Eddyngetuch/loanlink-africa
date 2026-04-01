const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.connect().then(() => console.log('Redis connected'));

module.exports = client;
