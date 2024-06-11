const Router = require("express").Router;
const router = new Router();
const util = require("../api/util");
const debug = util.debug;
// [🔴 IMPORTANT]
// For production-ready apps, please follow the instructions mentioned in the link below
// https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#configure-webhooks
// Similarly, WhatsApp has a retry logic. Make sure you respond with an appropriate status code

// You need to verify webhook registration or else it will not be registered
router.get("/whatsapp/messages/hook", async (req, res) => {
  debug(
    "WhatsApp hook verified. You should be able to receive incoming messages"
  );
  const challenge = req.query["hub.challenge"];
  res.send(challenge);
});

// Parse the incoming message and send it to Pipedrive
// NB! Beware of WhatsApp's retry logic - for now, the endpoint is configured to return *success* no matter what
router.post("/whatsapp/messages/hook", async (req, res) => {
  const { direction, number, sender, message } = req.body;

  if (direction === "incoming" && sender && message) {
    const from = sender.phone; // extract the phone number from the webhook payload
    const msg_body =
      message.type === "text" ? message.text : `Sent [${message.type}]`;
    const msg_time = message.datetime; // extract the message timestamp from the webhook payload

    try {
      debug(
        `Incoming message from ${from}. Forwarding message to Pipedrive...`,
        message
      );
      await util.sendMessageToPD(
        req.user.access_token,
        from,
        msg_body,
        msg_time
      );
      debug(`Message forwarded to Pipedrive successfully`);
      res.sendStatus(200);
    } catch (e) {
      debug(`Oopsie, couldn't forward message to Pipedrive.`, e);
      res.sendStatus(500); // статус на 500, щоб вказати на помилку
    }
  } else {
    res.sendStatus(400); // статус на 400, щоб вказати на неправильний запит
  }
});

module.exports = router;
