const Agenda = require("agenda");
const { MongoClient } = require("mongodb");
const Symphony = require("symphony-api-client-node");

module.exports.register = async streamId => {
  const db = await MongoClient.connect(`${process.env.MONGOURL}`);
  const agenda = new Agenda().mongo(db, "jobs");

  await new Promise(resolve => agenda.once("ready", resolve));

  const dbo = await db.db("agendaChatbot");
  let curStreamId = await findCurrentStream(dbo, streamId);
  if (await curStreamId.hasNext()) {
    return "you're already in the notification list";
  }
  curStreamId = await dbo.collection("jobs").findOne();
  curStreamId = curStreamId ? curStreamId.data.streamId : [];
  curStreamId.push(streamId);
  agenda.every("1 minute", "notifyFund", { streamId: curStreamId });
  return `registered receiving notification successfully!`;
};

module.exports.unregister = async streamId => {
  const db = await MongoClient.connect(`${process.env.MONGOURL}`);
  const agenda = new Agenda().mongo(db, "jobs");

  await new Promise(resolve => agenda.once("ready", resolve));

  const dbo = await db.db("agendaChatbot");
  let curStreamId = await findCurrentStream(dbo, streamId);
  curStreamId = await (curStreamId.hasNext ? curStreamId.next() : null);
  if (curStreamId) {
    curStreamId = curStreamId.data.streamId;
    curStreamId = curStreamId.filter(id => id !== streamId);
    if (curStreamId.length > 0) {
      agenda.every("1 minute", "notifyFund", { streamId: curStreamId });
    } else {
      agenda.cancel({ name: "notifyFund" });
    }
    return "you have been removed in notify fund list";
  }
  return "you're already not in the notification list";
};

async function findCurrentStream(dbo, streamId) {
  return await dbo
    .collection("jobs")
    .find({ "data.streamId": new RegExp(streamId, "ig") });
}
