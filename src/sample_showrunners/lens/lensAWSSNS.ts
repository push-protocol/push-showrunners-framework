import bodyParser from "body-parser";
import express from "express";
import { Container } from 'typedi';
import fetch from "node-fetch";
import lensChannel from './lensChannel';
const app = express();
const port = 443;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const lensCh = Container.get(lensChannel);

app.get('/apis/lens/notifications/status', (req, res) => {
  res.status(200).send('<h1><strong>LensV2 on port 443 is healthy</strong></h1>');
});

app.post("/apis/lens/notifications", async (req, res) => {
  const buffers = [];
   
  for await (const chunk of req) {
    buffers.push(chunk);
  }

  const data = Buffer.concat(buffers).toString();
    const payload = JSON.parse(data);
  if (payload.Type === "Notification") {
  //
//    console.log("SNS message is a notification ", payload);
  lensCh.handler(payload);

    console.log("------------------------------------------------------");
      res.sendStatus(200);
    return;
  }

  if (payload.Type === "SubscriptionConfirmation") {
    const url = payload.SubscribeURL;
    const response = await fetch(url);
    if (response.status === 200) {
      console.log("Subscription confirmed");
      console.log("------------------------------------------------------");
      console.log("------------------------------------------------------");
      console.log("------------------------------------------------------");
      res.sendStatus(200);
      return;
    } else {
      console.error("Subscription failed");
      res.sendStatus(500);
      return;
    }
  }

});

app.listen(port, () =>
  console.log("SNS notification listening on port " + port + "!")
);
