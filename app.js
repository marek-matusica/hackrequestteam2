const { App } = require("@slack/bolt");
const { db } = require("./src/db/db");

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  port: process.env.PORT || 3000
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say(`Hey there <@${message.user}>!`);
});


// Handle /hlasovanie command
app.command('/hlasovanie', async ({ command, ack, respond }) => {
  await ack();

  // Get channel info to use as project name
  const channelInfo = await app.client.conversations.info({
    channel: command.channel_id
  });

  const projectName = channelInfo.channel?.name || 'Neznámy projekt';

  try {
    await respond({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Hlasovanie: ${projectName}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Prosím ohodnoťte svoj level spokojnosti (1-10):'
          }
        },
        {
          type: 'actions',
          block_id: 'satisfaction_scale',
          elements: [
            {
              type: 'radio_buttons',
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '1 - Veľmi nespokojný',
                    emoji: true
                  },
                  value: '1'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '2',
                    emoji: true
                  },
                  value: '2'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '3',
                    emoji: true
                  },
                  value: '3'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '4',
                    emoji: true
                  },
                  value: '4'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '5 - Neutrálny',
                    emoji: true
                  },
                  value: '5'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '6',
                    emoji: true
                  },
                  value: '6'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '7',
                    emoji: true
                  },
                  value: '7'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '8',
                    emoji: true
                  },
                  value: '8'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '9',
                    emoji: true
                  },
                  value: '9'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '10 - Veľmi spokojný',
                    emoji: true
                  },
                  value: '10'
                }
              ],
              action_id: 'select_satisfaction'
            }
          ]
        },
        {
          type: 'input',
          block_id: 'additional_feedback',
          element: {
            type: 'plain_text_input',
            action_id: 'feedback_input',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Vložte svoj komentár alebo spätnú väzbu...'
            }
          },
          label: {
            type: 'plain_text',
            text: 'Doplňujúca spätná väzba'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Odoslať hodnotenie',
                emoji: true
              },
              style: 'primary',
              action_id: 'submit_voting'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
});

// Handle satisfaction scale selection
app.action('select_satisfaction', async ({ ack }) => {
  await ack();
});

// Handle feedback input
app.action('feedback_input', async ({ ack }) => {
  await ack();
});

// Handle form submission
app.action('submit_voting', async ({ ack, body, client, view }) => {
  await ack();

  try {
    // Get values from state instead of blocks
    const satisfaction = body.state.values.satisfaction_scale.select_satisfaction.selected_option.value;
    const feedback = body.state.values.additional_feedback.feedback_input.value;

    // Send confirmation message
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: `Ďakujeme za vaše hodnotenie!\nSpokojnosť: ${satisfaction}/10\nSpätná väzba: ${feedback}`
    });

  } catch (error) {
    console.error('Error processing submission:', error);
    // Send error message to user
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: 'Prepáčte, nastala chyba pri spracovaní vášho hodnotenia. Skúste to prosím znova.'
    });
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  app.logger.info("⚡️ Bolt app is running!");
  app.logger.info(process.env.DATABASE_URL);
  app.logger.info(process.env.ABCD);

  await db.execute("select 1");

  app.logger.info("🐘 Drizzle is connected!");
})();
