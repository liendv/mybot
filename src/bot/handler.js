const services = require("../services");
const scheduler = require("../scheduler");
const Symphony = require("symphony-api-client-node");
const asyncRedis = require("async-redis");
const client = asyncRedis.createClient(6379);
const { NlpManager } = require("node-nlp");
const manager = new NlpManager({ languages: ["en"] });
const file = require("./loadData");
const config = require("../config");
let chann;

(async () => {
  await file.loadFile(manager, "./data/questions.csv", "questions");
  await manager.train();
  manager.save();
  const connection = await config.initRabbitMQConn();
  chann = connection.channel;
  consumeMessage(chann);
})();

module.exports.handleMessage = async (_event, messages) => {
  console.time("handleMessage");
  const qRegex = new RegExp(process.env.CURRENCY_EXCHANCE_REGEX.trim(), "ig");
  const topfundReg = new RegExp(process.env.DBS_TOP_FUND_REGEX.trim(), "ig");
  const notifyReg = new RegExp(process.env.REGISTER_INFO_REGEX.trim(), "ig");
  const stockIsinReg = new RegExp(process.env.STOCK_ISIN_REGEX.trim(), "ig");
  const unnotifyReg = new RegExp(
    process.env.UNREGISTER_INFO_REGEX.trim(),
    "ig"
  );
  messages.forEach(async (message, index) => {
    const pMessage = await manager.process("en", message.messageText);
    console.log("Process Message: ", pMessage);

    switch (true) {
      case qRegex.test(message.messageText):
        reply_message = await getExchangeMessage(message, client);
        break;
      case topfundReg.test(message.messageText):
        reply_message = await services.dbsFundService.getMessage(client);
        break;
      case notifyReg.test(message.messageText):
        reply_message = await scheduler.publisher
          .register(message.stream.streamId)
          .catch(error => {
            console.error("Error", error);
          });
        break;
      case stockIsinReg.test(message.messageText):
        services.stockService.publishStockQuote(
          message.messageText.match(stockIsinReg)[0],
          chann,
          message.stream.streamId
        );
        reply_message = "bot is processing your request";
        break;
      case unnotifyReg.test(message.messageText):
        reply_message = await scheduler.publisher
          .unregister(message.stream.streamId)
          .catch(error => {
            console.error("Error: ", error);
          });
        break;
      default:
        reply_message =
          "Hi boss, currently I can serve as below commands:<br/>" +
          "1. convert|change [AMOOUNT] {CURRENCY1} to {CURRENCY2}: to exchange money<br/>" +
          "2. show top|dbs fund: to show top fund of this year<br/>" +
          "3. register|notify me: to add user in the list receiving notification of top fund this year<br/>" +
          "4. remove|delete me: to remove user from notification list";
        break;
    }
    Symphony.sendMessage(
      message.stream.streamId,
      reply_message,
      null,
      Symphony.MESSAGEML_FORMAT
    );
    console.timeEnd("handleMessage");
  });
};

async function getExchangeMessage(message, client) {
  const currencyReg = new RegExp(process.env.CURRENCY_REGEX.trim(), "ig");
  let reply_message = "";
  const [base1, base2] = message.messageText
    .match(currencyReg)
    .map(x => x.toUpperCase());

  const numRegex = new RegExp(/\d+/);
  let amount = 1;

  if ((nums = message.messageText.match(numRegex))) {
    amount = Number(nums[0]);
  }
  if (!base1 || !base2) {
    reply_message = `Hi ${message.user.firstName}, please give fully correct currencies`;
    return reply_message;
  }

  const rate = await services.dbsExchangeService.getExchangeRate(
    base1,
    base2,
    client
  );
  reply_message = `Hi ${
    message.user.firstName
  }, currently change ${amount} ${base1} to ${base2} is: ${Number(
    rate.rates[base2]
  ) * amount}`;
  return reply_message;
}

async function consumeMessage(channel) {
  const q = await channel.assertQueue(process.env.STOCK_QUOTE_RESPONSE_QUEUE, {
    durable: true
  });
  channel.consume(
    q.queue,
    message => {
      const content = JSON.parse(message.content.toString());
      const streamId = content.streamId;
      console.log(content);
      Symphony.sendMessage(
        streamId,
        buildTableMessage([content]),
        null,
        Symphony.MESSAGEML_FORMAT
      );
    },
    { noAck: true }
  );
}

function buildTableMessage(message) {
  let reply_message = `<table>
    <thead style="background-color:#3375FF;color:#FFFFFF">
      <tr>
        <td>ISIN</td>
        <td>Open Price</td>
        <td>High Price</td>
        <td>Low Price</td>
        <td>Close Price</td>
        <td>Volume</td>
        <td>Last Update</td>
      </tr>
    </thead>
    <tbody>`;
  message.forEach(msg => {
    reply_message += formatMessage(msg);
  });
  reply_message += "</tbody></table>";
  return reply_message;
}

function formatMessage(msg) {
  return `<tr>
            <td>${msg.isin}</td>
            <td>${msg.openPrice}</td>
            <td>${msg.highPrice}</td>
            <td>${msg.lowPrice}</td>
            <td>${msg.closePrice}</td>
            <td>${msg.volume}</td>
            <td>${msg.timestamp}</td>
          </tr>`;
}
