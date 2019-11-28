const fetch = require("node-fetch");

module.exports.getExchangeRate = async (base1, base2, client) => {
  const searchKey = `${base1}-${base2}`;
  let result = await client.get(searchKey);
  if (!result) {
    result = await queryExchangeRate(base1, base2);
    if (result) {
      client.setex(searchKey, 3600, JSON.stringify(result));
    }
  } else {
    result = JSON.parse(result);
  }
  console.log("result: ", result);
  return result;
};

async function queryExchangeRate(base1, base2) {
  let rate = await fetch(
    `${process.env.CURRENCY_EXCHANGE_URL}?base=${base1}&symbols=${base2}`
  );
  rate = await rate.json();
  return rate;
}
