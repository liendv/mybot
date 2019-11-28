const amqp = require("amqplib");

module.exports.initRabbitMQConn = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URI);
    const chan = await conn.createChannel();
    chan.prefetch(1);
    conn.on("close", () => {
      if (chan) chan.close();
    });
    return { conn: conn, channel: chan };
  } catch (error) {
    console.error("Rabbit MQ connection error: ", error);
    setTimeout(initRabbitMQConn(), 30000);
  }
};
