const fetch = require("node-fetch");

const dbsAuth = async () => {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      clientId: process.env.DBS_CLIENT_ID
    },
    body: JSON.stringify({
      client_id: process.env.DBS_APP_NAME,
      client_assertion: process.env.DBS_JWT_TOKEN
    })
  };
  let auth;
  try {
    auth = await fetch(process.env.DBS_AUTH_URL, options).catch(err => err);
    auth = await auth.json();
  } catch (err) {
    return "";
  }
  return auth;
};

module.exports.getAccessToken = async function(client) {
  const result = await client.get("accessToken");
  if (result && result.access_token) {
    return result.access_token;
  }
  const authInfo = await dbsAuth();
  client.setex("accessToken", 3600, JSON.stringify(authInfo));
  return authInfo.access_token;
};
