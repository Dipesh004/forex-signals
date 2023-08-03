const express = require("express");
const cron = require("node-cron");
const MiddleWares = require("./extra");
const nodemailer = require("nodemailer");
const { default: axios } = require("axios");

const app = express();
MiddleWares(app);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_ID,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});
let eurUsdRoundNumbersArray;
const settingRoundNumbersEurUsd = async () => {
  console.log("Cron job is running at:", new Date().toISOString());
  // Put your code or function call here to be executed at the specified interval.
  //api call to fetch current market price
  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "USD",
      from_symbol: "EUR",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will find the round numbers upto 3 decimal places
    const options1 = {
      method: "POST",
      url: "https://ai-textraction.p.rapidapi.com/textraction",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": "ai-textraction.p.rapidapi.com",
      },
      data: {
        text: `this is the current price of EUR/USD forex pair - ${currentMarketPrice}`,
        entities: [
          {
            var_name: "roundNumbers",
            type: "array[string]",
            description:
              "the 5 closest round number upto 3 digits of the current market price. the round number should be even on 3rd digit. ex- 1.09400,1.09600,1.09200 ",
          },
        ],
      },
    };
    try {
      const response1 = await axios.request(options1);
      console.log("response from the aitextraction values", response1.data);

      eurUsdRoundNumbersArray = response1.data.results.roundNumbers;
      console.log(
        "logging what we set in eur usd round number arrays",
        eurUsdRoundNumbersArray
      );
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const comparingRoundNumbersEurUsd = async () => {
  console.log("Cron job is running at:", new Date().toISOString());

  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "USD",
      from_symbol: "EUR",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will compare the stored round number to current price
    function checkProximityToRoundNumbers(
      currentPrice,
      roundNumbers,
      proximity
    ) {
      const currentPriceFloat = parseFloat(currentPrice);

      for (const roundNumber of roundNumbers) {
        const roundNumberFloat = parseFloat(roundNumber);

        // Check if the absolute difference between the current price and round number is within the proximity
        if (Math.abs(currentPriceFloat - roundNumberFloat) <= proximity) {
          return roundNumberFloat;
        }
      }

      return null;
    }

    // Proximity level (you can adjust this based on your preference)
    const proximity = 0.00001; // Example: 0.001 means the current price should be within 0.001 of a round number

    // Fetch the current market price

    // Check proximity to round numbers
    const roundedPrice = checkProximityToRoundNumbers(
      currentMarketPrice,
      eurUsdRoundNumbersArray,
      proximity
    );

    if (roundedPrice !== null) {
      console.log(
        `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`
      );
      const mailOptions = {
        from: process.env.NODEMAILER_ID,
        to: process.env.NODEMAILER_REC, // Replace with the recipient's email address
        subject: "Forex EUR/USD signals",
        text: `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
    } else {
      console.log(
        `Current price ${currentMarketPrice} is not around any of the round numbers.`
      );
    }
  } catch (error) {
    console.log(error.message);
  }
};

cron.schedule("0 8 * * *", settingRoundNumbersEurUsd);
cron.schedule("0 20 * * *", settingRoundNumbersEurUsd);
cron.schedule("0,7,14,21,28,35,42,49,56 * * * *", comparingRoundNumbersEurUsd);
// settingRoundNumbersEurUsd().then(() => comparingRoundNumbersEurUsd());
//
//
//
//
//
let usdJpyRoundNumbersArray;
const settingRoundNumbersUsdJpy = async () => {
  console.log("Cron job is running at:", new Date().toISOString());
  // Put your code or function call here to be executed at the specified interval.
  //api call to fetch current market price
  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "JPY",
      from_symbol: "USD",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will find the round numbers upto 3 decimal places
    const options1 = {
      method: "POST",
      url: "https://ai-textraction.p.rapidapi.com/textraction",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": "ai-textraction.p.rapidapi.com",
      },
      data: {
        text: `this is the current price of USD/JPY forex pair - ${currentMarketPrice}`,
        entities: [
          {
            var_name: "roundNumbers",
            type: "array[string]",
            description:
              "the 5 closest round number upto 1 decimal places of the current market price. values on 3rd digit must be 0 and 5 only. ex- 142.0,142.5,143.0 etc ",
          },
        ],
      },
    };
    try {
      const response1 = await axios.request(options1);
      console.log("response from the aitextraction values", response1.data);

      usdJpyRoundNumbersArray = response1.data.results.roundNumbers;
      console.log(
        "logging what we set in usdjpy round number arrays",
        usdJpyRoundNumbersArray
      );
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const comparingRoundNumbersUsdJpy = async () => {
  console.log("Cron job is running at:", new Date().toISOString());

  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "JPY",
      from_symbol: "USD",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will compare the stored round number to current price
    function checkProximityToRoundNumbers(
      currentPrice,
      roundNumbers,
      proximity
    ) {
      const currentPriceFloat = parseFloat(currentPrice);

      for (const roundNumber of roundNumbers) {
        const roundNumberFloat = parseFloat(roundNumber);

        // Check if the absolute difference between the current price and round number is within the proximity
        if (Math.abs(currentPriceFloat - roundNumberFloat) <= proximity) {
          return roundNumberFloat;
        }
      }

      return null;
    }

    // Proximity level (you can adjust this based on your preference)
    const proximity = 0.001; // Example: 0.001 means the current price should be within 0.001 of a round number

    // Fetch the current market price

    // Check proximity to round numbers
    const roundedPrice = checkProximityToRoundNumbers(
      currentMarketPrice,
      usdJpyRoundNumbersArray,
      proximity
    );

    if (roundedPrice !== null) {
      console.log(
        `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`
      );
      const mailOptions = {
        from: process.env.NODEMAILER_ID,
        to: process.env.NODEMAILER_REC, // Replace with the recipient's email address
        subject: "Forex USD/JPY signals",
        text: `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
    } else {
      console.log(
        `Current price ${currentMarketPrice} is not around any of the round numbers.`
      );
    }
  } catch (error) {
    console.log(error.message);
  }
};

cron.schedule("3 8 * * *", settingRoundNumbersUsdJpy);
cron.schedule("3 20 * * *", settingRoundNumbersUsdJpy);
cron.schedule("1,8,15,22,29,36,43,50,57 * * * *", comparingRoundNumbersUsdJpy);
// settingRoundNumbersUsdJpy().then(() => comparingRoundNumbersUsdJpy());
//
//
//
//
let gbpUsdRoundNumbersArray;
const settingRoundNumbersGbpUsd = async () => {
  console.log("Cron job is running at:", new Date().toISOString());
  // Put your code or function call here to be executed at the specified interval.
  //api call to fetch current market price
  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "USD",
      from_symbol: "GBP",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    console.log("we are hereee");
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will find the round numbers upto 3 decimal places
    const options1 = {
      method: "POST",
      url: "https://ai-textraction.p.rapidapi.com/textraction",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": "ai-textraction.p.rapidapi.com",
      },
      data: {
        text: `this is the current price of GBP/USD forex pair - ${currentMarketPrice}`,
        entities: [
          {
            var_name: "roundNumbers",
            type: "array[string]",
            description:
              "the 5 closest round number upto 3 decimal places of the current market price.values on 3rd digit must be 0 and 5 only. ex- 1.265,1.260,1.270 etc ",
          },
        ],
      },
    };
    try {
      const response1 = await axios.request(options1);
      console.log("response from the aitextraction values", response1.data);

      gbpUsdRoundNumbersArray = response1.data.results.roundNumbers;
      console.log(
        "logging what we set in usdjpy round number arrays",
        gbpUsdRoundNumbersArray
      );
    } catch (error) {
      console.error(error.message);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const comparingRoundNumbersGbpUsd = async () => {
  console.log("Cron job is running at:", new Date().toISOString());

  const options = {
    method: "GET",
    url: "https://alpha-vantage.p.rapidapi.com/query",
    params: {
      function: "FX_INTRADAY",
      interval: "5min",
      to_symbol: "USD",
      from_symbol: "GBP",
      datatype: "json",
      outputsize: "compact",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_API_KEY,
      "X-RapidAPI-Host": "alpha-vantage.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    // console.log("the market prices that came", response.data);
    const marketDataObject = response.data;
    const allCandlesObject = Object.keys(marketDataObject)[1];
    // console.log("allCandlesObject", allCandlesObject);
    const allCandlesData = marketDataObject[allCandlesObject];
    // console.log("allcandlesdata", allCandlesData);
    const firstCandleTimeStamp = Object.keys(allCandlesData)[0];
    const firstCandleData = allCandlesData[firstCandleTimeStamp];
    console.log("first candle data", firstCandleData);

    const currentMarketPrice = firstCandleData["4. close"];
    console.log("current market price", currentMarketPrice);
    //now we will compare the stored round number to current price
    function checkProximityToRoundNumbers(
      currentPrice,
      roundNumbers,
      proximity
    ) {
      const currentPriceFloat = parseFloat(currentPrice);

      for (const roundNumber of roundNumbers) {
        const roundNumberFloat = parseFloat(roundNumber);

        // Check if the absolute difference between the current price and round number is within the proximity
        if (Math.abs(currentPriceFloat - roundNumberFloat) <= proximity) {
          return roundNumberFloat;
        }
      }

      return null;
    }

    // Proximity level (you can adjust this based on your preference)
    const proximity = 0.00001; // Example: 0.001 means the current price should be within 0.001 of a round number

    // Fetch the current market price

    // Check proximity to round numbers
    const roundedPrice = checkProximityToRoundNumbers(
      currentMarketPrice,
      gbpUsdRoundNumbersArray,
      proximity
    );

    if (roundedPrice !== null) {
      console.log(
        `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`
      );
      const mailOptions = {
        from: process.env.NODEMAILER_ID,
        to: process.env.NODEMAILER_REC, // Replace with the recipient's email address
        subject: "Forex GBP/USD signals",
        text: `Current price ${currentMarketPrice} is around the round number ${roundedPrice}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
    } else {
      console.log(
        `Current price ${currentMarketPrice} is not around any of the round numbers.`
      );
    }
  } catch (error) {
    console.log(error.message);
  }
};

cron.schedule("5 8 * * *", settingRoundNumbersGbpUsd);
cron.schedule("5 20 * * *", settingRoundNumbersGbpUsd);
cron.schedule("2,9,16,23,30,37,44,51,58 * * * *", comparingRoundNumbersGbpUsd);
// settingRoundNumbersGbpUsd().then(() => comparingRoundNumbersGbpUsd());
app.get("/", async (req, res) => {
  res.status(200).send("Forex Price demo");
});
const port = process.env.PORT || 5000;
const server = app.listen(port, () =>
  console.log(`Listening on port ${port}...`)
);
