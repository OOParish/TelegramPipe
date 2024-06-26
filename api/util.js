// Setting this environment variable allows us have detailed logs
process.env.DEBUG = "app";

const request = require("request-promise");
const debug = require("debug")("app");
debug.log = console.info.bind(console);

//Get basic details about the user by calling `users/me` endpoint
async function getUser(accessToken) {
  debug("Retrieving user details using the access token");
  const requestOptions = {
    uri: "https://api.pipedrive.com/v1/users/me",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    json: true,
  };
  const userInfo = await request(requestOptions);

  return userInfo;
}

// Create a messaging channel in Pipedrive
async function createChannel(accessToken, id, name, type) {
  const requestOptions = {
    uri: "https://api.pipedrive.com/v1/channels",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      name: name,
      provider_channel_id: id,
      avatar_url:
        "https://robohash.org/mxtouwlpxqjqtxiltdui?set=set1&bgset=&size=48x48",
      provider_type: type,
    },
    json: true,
  };
  const response = await request(requestOptions);
  debug("Channel created!");

  return response;
}

// Forward message to WhatsApp using their Graph API
async function sendMessageToWA(msg, recipientId) {
  debug("Sending a whatsapp message based on data received from Pipedrive");
  const requestOptions = {
    uri: `https://telegram.e-chat.tech/api/SendMessage.php`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WA_TOKEN}`,
    },
    json: {
      messaging_product: "whatsapp",
      to: recipientId.split("wa-")[1],
      type: "text",
      text: {
        preview_url: true,
        body: msg,
      },
    },
  };
  const response = await request(requestOptions);
  debug("Message sent to WhatsApp from Pipedrive");
  return response;
}

// Forward message to Pipedrive Messaging Inbox using Channels API
async function sendMessageToPD(accessToken, from, msg, time) {
  debug(
    "Sending a Pipedrive Inbox message based on data from WhatsApp chat:",
    msg
  );
  const requestOptions = {
    uri: "https://api.pipedrive.com/v1/channels/messages/receive",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      id: "msg-wa-" + Date.now(),
      channel_id: process.env.CHANNEL_ID,
      conversation_id: `conversation-${from}`,
      sender_id: `sender-wa-${from}`,
      message: msg,
      status: "sent",
      created_at: new Date(parseInt(time) * 1000)
        .toISOString()
        .replace("T", " ")
        .substring(0, 16),
      attachments: [],
    },
    json: true,
  };
  const status = await request(requestOptions);
  debug("Message sent to Pipedrive from WhatsApp");
  return status;
}

// Figure out the domain in which the app is running
async function getAppDomain(port = 3000) {
  let domain;
  if (process.env.PROJECT_DOMAIN) {
    domain = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
  } else {
    domain = `http://localhost:${port}`;
  }
  return domain;
}

// Dynamically generate the manifest.json file
function generateManifest(domain) {
  return {
    version: "v202101",
    endpoints: {
      getConversations: `${domain}/channels/:providerChannelId/conversations`,
      getConversationById: `${domain}/channels/:providerChannelId/conversations/:sourceConversationId`,
      postMessage: `${domain}/channels/:providerChannelId/messages`,
      getSenderById: `${domain}/channels/:providerChannelId/senders/:senderId`,
      deleteChannelById: `${domain}/channels/:providerChannelId`,
      getTemplates: `${domain}/channels/:providerChannelId/templates`,
      getMessageById: `${domain}/channels/:providerChannelId/conversations/:sourceConversationId/messages/:sourceMessageId`,
    },
  };
}

// Calculate access token expiry in minutes
function getAccessTokenExpiry(expiry_ts) {
  const remaining_minutes = parseInt(
    (parseInt(expiry_ts) - parseInt(Date.now())) / (1000 * 60)
  );
  return {
    expired: remaining_minutes <= 0,
    remaining_minutes,
  };
}

module.exports = {
  debug,
  getUser,
  getAppDomain,
  getAccessTokenExpiry,
  generateManifest,
  createChannel,
  sendMessageToWA,
  sendMessageToPD,
};
