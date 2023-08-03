function MiddleWares(app) {
  const dotenv = require("dotenv");
  const bodyParser = require("body-parser");
  const cors = require("cors");
  const express = require("express");

  dotenv.config();

  // Set up OpenAI API

  // Create a new express app

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "x-auth-token"); // Replace 'x-custom-header' with your custom header name
    next();
  });
  //app.use(cors());
  app.use(
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    })
  );
}

module.exports = MiddleWares;
