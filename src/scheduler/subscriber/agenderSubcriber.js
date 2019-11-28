const Agenda = require("agenda");
const { MongoClient } = require("mongodb");
const Symphony = require("symphony-api-client-node");
const dbsFundService = require("../../services/dbsFundService");

module.exports.run = async client => {
  const db = await MongoClient.connect(`${process.env.MONGOURL}`);
  const agenda = new Agenda().mongo(db, "jobs");

  agenda.define("notifyFund", async job => {
    let messages = await dbsFundService.getMessage(client);
    let streamIds = job.attrs.data.streamId;
    streamIds.forEach(id => {
      Symphony.sendMessage(id, messages, null, Symphony.MESSAGEML_FORMAT);
    });
  });
  await new Promise(resolve => agenda.once("ready", resolve));
  agenda.start();
};
