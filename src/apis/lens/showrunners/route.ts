import bodyParser from "body-parser";
import express from "express";
import fetch from "node-fetch";

const app = express();
const port = 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/lens/notifications", async (req, res) => {
  const buffers = [];

  for await (const chunk of req) {
    buffers.push(chunk);
  }

  const data = Buffer.concat(buffers).toString();
  // example https://docs.aws.amazon.com/connect/latest/adminguide/sns-payload.html
  const payload = JSON.parse(data);

  // if you already done the handshake you will get a Notification type
  // example below: https://docs.aws.amazon.com/sns/latest/dg/sns-message-and-json-formats.html
  // {
  //   "Type" : "Notification",
  //   "MessageId" : "22b80b92-fdea-4c2c-8f9d-bdfb0c7bf324",
  //   "TopicArn" : "arn:aws:sns:us-west-2:123456789012:MyTopic",
  //   "Subject" : "My First Message",
  //   "Message" : "Hello world!",
  //   "Timestamp" : "2012-05-02T00:54:06.655Z",
  //   "SignatureVersion" : "1",
  //   "Signature" : "EXAMPLEw6JRN...",
  //   "SigningCertURL" : "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-f3ecfb7224c7233fe7bb5f59f96de52f.pem",
  //   "UnsubscribeURL" : "https://sns.us-west-2.amazonaws.com/?Action=Unsubscribe SubscriptionArn=arn:aws:sns:us-west-2:123456789012:MyTopic:c9135db0-26c4-47ec-8998-413945fb5a96"
  // }
  if (payload.Type === "Notification") {
    console.log("SNS message is a notification ", payload);
    console.log("------------------------------------------------------");
    console.log("------------------------------------------------------");
    console.log("------------------------------------------------------");
    res.sendStatus(200);
    return;
  }

  // only need to do this the first time this is doing an handshake with the sns client
  // example below: https://docs.aws.amazon.com/sns/latest/dg/sns-message-and-json-formats.html
  // {
  //   "Type" : "SubscriptionConfirmation",
  //   "MessageId" : "165545c9-2a5c-472c-8df2-7ff2be2b3b1b",
  //   "Token" : "2336412f37...",
  //   "TopicArn" : "arn:aws:sns:us-west-2:123456789012:MyTopic",
  //   "Message" : "You have chosen to subscribe to the topic arn:aws:sns:us-west-2:123456789012:MyTopic.\nTo confirm the subscription, visit the SubscribeURL included in this message.",
  //   "SubscribeURL" : "https://sns.us-west-2.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-west-2:123456789012:MyTopic&Token=2336412f37...",
  //   "Timestamp" : "2012-04-26T20:45:04.751Z",
  //   "SignatureVersion" : "1",
  //   "Signature" : "EXAMPLEpH+DcEwjAPg8O9mY8dReBSwksfg2S7WKQcikcNKWLQjwu6A4VbeS0QHVCkhRS7fUQvi2egU3N858fiTDN6bkkOxYDVrY0Ad8L10Hs3zH81mtnPk5uvvolIC1CXGu43obcgFxeL3khZl8IKvO61GWB6jI9b5+gLPoBc1Q=",
  //   "SigningCertURL" : "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-f3ecfb7224c7233fe7bb5f59f96de52f.pem"
  // }
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

  console.log("Received message from SNS", payload);

  // if it gets this far it is a unsubscribe request
  // {
  //   "Type" : "UnsubscribeConfirmation",
  //   "MessageId" : "47138184-6831-46b8-8f7c-afc488602d7d",
  //   "Token" : "2336412f37...",
  //   "TopicArn" : "arn:aws:sns:us-west-2:123456789012:MyTopic",
  //   "Message" : "You have chosen to deactivate subscription arn:aws:sns:us-west-2:123456789012:MyTopic:2bcfbf39-05c3-41de-beaa-fcfcc21c8f55.\nTo cancel this operation and restore the subscription, visit the SubscribeURL included in this message.",
  //   "SubscribeURL" : "https://sns.us-west-2.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-west-2:123456789012:MyTopic&Token=2336412f37fb6...",
  //   "Timestamp" : "2012-04-26T20:06:41.581Z",
  //   "SignatureVersion" : "1",
  //   "Signature" : "EXAMPLEHXgJm...",
  //   "SigningCertURL" : "https://sns.us-west-2.amazonaws.com/SimpleNotificationService-f3ecfb7224c7233fe7bb5f59f96de52f.pem"
  // }
});

app.listen(port, () =>
  console.log("SNS notification listening on port " + port + "!")
);