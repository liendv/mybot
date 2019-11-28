const Symphony = require("symphony-api-client-node");
const asyncRedis = require("async-redis");
const client = asyncRedis.createClient(6379);
const dotenv = require("dotenv");
const bot = require("./src/bot");
const scheduler = require("./src/scheduler");

dotenv.config();
client.on("error", err => {
  console.log("Error " + err);
});

Symphony.setDebugMode(true);

Symphony.initBot(__dirname + "/config.json").then(symAuth => {
  Symphony.getDatafeedEventsService(bot.handleMessage);
  scheduler.subscriber.run(client).catch(error => {
    console.error("Error: ", error);
  });
});
