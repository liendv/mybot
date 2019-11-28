const fetch = require("node-fetch");
const dbsAuthService = require("./dbsAuthService");

async function getTopFund(accessToken) {
  const options = {
    headers: {
      clientId: process.env.DBS_CLIENT_ID,
      accessToken: accessToken,
      "Content-Type": "application/json"
    }
  };
  let fund;
  try {
    fund = await fetch(process.env.DBS_TOP_FUND_URL, options);
    fund = await fund.json();
  } catch (e) {
    console.log(e);
  }
  return fund;
}

module.exports.getMessage = async client => {
  let message = await client.get("topFund");
  if (!message) {
    const accessToken = await dbsAuthService.getAccessToken(client);
    try {
      message = await getTopFund(accessToken);
      client.setex("topFund", 120, JSON.stringify(message));
    } catch (err) {
      console.log("Err: ", err);
      message = "The system is in maintainance, please wait for awhile!";
    }
  } else {
    message = JSON.parse(message);
  }

  let reply_message =
    "Hi boss, here is the list of top fund this year:<br/><br/>" +
    '<table><thead style="background-color:#3375FF;color:#FFFFFF"><tr><td>ISIN</td><td>Fund Name</td><td>Indicative Price</td></tr></thead><tbody>';
  message.forEach(msg => {
    reply_message += formatMessage(msg);
  });
  reply_message += "</tbody></table>";
  return reply_message;
};

function formatMessage(message) {
  return `<tr>
            <td>${message.ISIN}</td>
            <td>${message.fundName}</td>
            <td>${message.indicativePrice}</td>
          </tr>`;
}
