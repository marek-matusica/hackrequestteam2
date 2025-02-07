const { App } = require("@slack/bolt");
const { db } = require("./src/db/db");
const { votes, points } = require("./src/db/schema");

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    port: process.env.PORT || 3000,
});

// Listens to incoming messages that contain "hello"
app.message("hello", async ({ message, say }) => {
    // say() sends a message to the channel where the event was triggered
    await say(`Hey there <@${message.user}>!`);
});

// Handle /hlasovanie command
app.command("/pnps", async ({ command, ack, respond }) => {
    await ack();

    // Get channel info to use as project name
    const channelInfo = await app.client.conversations.info({
        channel: command.channel_id,
    });

    const projectName = channelInfo.channel?.name || "Neznámy projekt";

    try {
        await respond({
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `Hlasovanie: ${projectName}`,
                        emoji: true,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Aká je pravdepodobnosť, že by si kolegovi odporučil vybraný projekt? 👍🏼/👎🏼( 0 nízka - 10 vysoká )",
                    },
                },
                {
                    type: "actions",
                    block_id: "satisfaction_scale",
                    elements: [
                        {
                            type: "radio_buttons",
                            options: [
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "1",
                                        emoji: true,
                                    },
                                    value: "1",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "2",
                                        emoji: true,
                                    },
                                    value: "2",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "3",
                                        emoji: true,
                                    },
                                    value: "3",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "4",
                                        emoji: true,
                                    },
                                    value: "4",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "5",
                                        emoji: true,
                                    },
                                    value: "5",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "6",
                                        emoji: true,
                                    },
                                    value: "6",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "7",
                                        emoji: true,
                                    },
                                    value: "7",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "8",
                                        emoji: true,
                                    },
                                    value: "8",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "9",
                                        emoji: true,
                                    },
                                    value: "9",
                                },
                                {
                                    text: {
                                        type: "plain_text",
                                        text: "10",
                                        emoji: true,
                                    },
                                    value: "10",
                                },
                            ],
                            action_id: "select_satisfaction",
                        },
                    ],
                },
                {
                    type: "input",
                    block_id: "fieldsOfInterest",
                    element: {
                        type: "multi_static_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Vyberte oblasti",
                            emoji: true,
                        },
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "📊 Objem práce",
                                    emoji: true,
                                },
                                value: "workload",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "👥 Tímová spolupráca",
                                    emoji: true,
                                },
                                value: "teamwork",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "📋 Povaha projektu",
                                    emoji: true,
                                },
                                value: "project_nature",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "🤝 Spolupráca s klientom",
                                    emoji: true,
                                },
                                value: "client_cooperation",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "💬 Tímová komunikácia",
                                    emoji: true,
                                },
                                value: "team_communication",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "📈 Možnosť rozvoja",
                                    emoji: true,
                                },
                                value: "growth_opportunity",
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "💡 Priestor na inovácie",
                                    emoji: true,
                                },
                                value: "innovation_space",
                            },
                        ],
                        action_id: "select_fields",
                    },
                    label: {
                        type: "plain_text",
                        text: "Vyberte oblasti, ktoré chcete ohodnotiť:",
                        emoji: true,
                    },
                },
                {
                    type: "input",
                    block_id: "additional_feedback",
                    element: {
                        type: "plain_text_input",
                        action_id: "feedback_input",
                        multiline: true,
                        placeholder: {
                            type: "plain_text",
                            text: "Vložte svoj komentár alebo spätnú väzbu...",
                        },
                    },
                    label: {
                        type: "plain_text",
                        text: "Doplňujúca spätná väzba",
                    },
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Odoslať hodnotenie",
                                emoji: true,
                            },
                            style: "primary",
                            action_id: "submit_voting",
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error("Error sending message:", error);
    }
});

// Handle /reset-points command
app.command("/pnps reset-points", async ({ command, ack, respond }) => {
    await ack();

    try {
        // Get channel info to use as project name
        const channelInfo = await app.client.conversations.info({
            channel: command.channel_id,
        });

        const projectName = channelInfo.channel?.name || "Neznámy projekt";

        // Reset points for the current project
        await db.delete(points).where(points.project.eq(projectName));

        await respond({
            text: `✅ Body pre projekt ${projectName} boli úspešne resetované.`,
            response_type: "in_channel",
        });
    } catch (error) {
        console.error("Error resetting points:", error);
        await respond({
            text: "❌ Nastala chyba pri resetovaní bodov. Skúste to prosím znova.",
            response_type: "ephemeral",
        });
    }
});

// Handle satisfaction scale selection
app.action("select_satisfaction", async ({ ack }) => {
    await ack();
});

// Handle fields selection
app.action("select_fields", async ({ ack }) => {
    await ack();
});

// Handle feedback input
app.action("feedback_input", async ({ ack }) => {
    await ack();
});

// Handle form submission
app.action("submit_voting", async ({ ack, body, client }) => {
    await ack();

    try {
        const userId = body.user.id;
        const project = body?.channel?.name;
        const satisfactionScale =
            body.state.values.satisfaction_scale.select_satisfaction
                .selected_option.value;
        const fieldsOfInterest =
            body.state.values.fieldsOfInterest.select_fields.selected_options.map(
                (option) => option.text.text
            );
        const additionalFeedback =
            body.state.values.additional_feedback.feedback_input.value;

        await db.insert(votes).values({
            userId,
            project,
            satisfaction: satisfactionScale,
            fieldsOfInterest,
            additionalFeedback,
        });

        // Format selected fields for display
        const fieldsText =
            fieldsOfInterest.length > 0
                ? "\nVybrané oblasti: " + fieldsOfInterest.join(", ")
                : "\nŽiadne vybrané oblasti";

        // Send confirmation message
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: `${userId}, ďakujeme za vaše hodnotenie projektu ${project}!\nSpokojnosť: ${satisfactionScale}/10${fieldsText}\nSpätná väzba: ${additionalFeedback}`,
        });
    } catch (error) {
        console.error("Error processing submission:", error);
        // Send error message to user
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: "Prepáčte, nastala chyba pri spracovaní vášho hodnotenia. Skúste to prosím znova.",
        });
    }
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);
    app.logger.info("⚡️ Bolt app is running!");
    app.logger.info(process.env.DATABASE_URL);
    await db.execute("select 1");
    app.logger.info("🐘 Drizzle is connected!");
})();
