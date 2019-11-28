const moment = require("moment");
const fetch = require("node-fetch");

const assertExchangeOptions = { durable: true };
const assertQueueOptions = { durable: true };

const assertAndSendToExchange = async (channel, exchange, routingKey, data) => {
  const bufferedData = Buffer.from(data);
  try {
    await channel.assertExchange(exchange, "topic", assertExchangeOptions);
    await channel.publish(exchange, routingKey, bufferedData);
    console.log(
      `[assertAndSendToExchange] success send message to exchange ${exchange} and routing ${routingKey}`
    );
  } catch (error) {
    console.error("[assertAndSendToExchange] error: ", error);
  }
};

module.exports.publishStockQuote = async (isin, channel, streamId) => {
  isin = isin.trim().toUpperCase();
  const currentTime = moment().format("HH:mm:ss");
  const dateTime = `2019-09-19 ${currentTime}`;
  const stockUrl = `http://localhost:9090/api/v1/stock/quotes?isin=${isin}&timestamp=${dateTime}`;
  let stockQuote;
  console.log("exchange: ", process.env.STOCK_QUOTE_EXCHANGE);
  console.log("key: ", process.env.STOCK_QUOTE_REQUEST_ROUTING_KEY);
  try {
    // stockQuote = await fetch(stockUrl);
    // stockQuote = await stockQuote.json();
    let body = JSON.stringify({
      streamId: streamId,
      searchTerm: isin,
      timestamp: dateTime
    });
    await assertAndSendToExchange(
      channel,
      process.env.STOCK_QUOTE_EXCHANGE,
      process.env.STOCK_QUOTE_REQUEST_ROUTING_KEY,
      body
    );
  } catch (error) {
    console.error("[getStockQuote] error: ", error);
    // stockQuote = "no data";
  }

  // return stockQuote;
};

module.exports.subscribeStockQuote = async channel => {
  let response;
  try {
    let q = await channel.assertQueue(
      process.env.STOCK_QUOTE_RESPONSE_QUEUE,
      assertQueueOptions
    );
    console.log("Queue: ", q.queue);
    response = await channel.consume(q.queue, message => console.log(message), {
      noAck: false
    });
    response = await response.content;
    console.log("response: ", response);
  } catch (error) {
    console.error("[subscribeStockQuote] error: ", error);
    response = "no data";
  }
  return response;
};
