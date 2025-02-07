const { App } = require("@slack/bolt");
const { db } = require("./src/db/db");
const { votes, points } = require("./src/db/schema");
const { and, eq, gte, lte, sql } = require("drizzle-orm");

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

// Helper function to get last month's vote
async function getLastMonthVote(userId, project) {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const lastVote = await db
        .select()
        .from(votes)
        .where(
            and(
                eq(votes.userId, userId),
                eq(votes.project, project),
                gte(votes.createdAt, startOfLastMonth),
                lte(votes.createdAt, endOfLastMonth)
            )
        )
        .limit(1);

    return lastVote[0];
}

// Handle /hlasovanie command
app.command("/pnps-create", async ({ command, ack, respond }) => {
    await ack();

    // Get channel info to use as project name
    const channelInfo = await app.client.conversations.info({
        channel: command.channel_id,
    });

    const projectName = channelInfo.channel?.name || "Neznámy projekt";

    try {
        // Check if there's a vote from last month
        const lastVote = await getLastMonthVote(command.user_id, projectName);

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `Projekt: ${projectName}`,
                    emoji: true,
                },
            },
        ];

        // Add reuse vote option if there was a vote last month
        if (lastVote) {
            blocks.push(
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "Našli sme vaše hodnotenie z minulého mesiaca. Chcete ho použiť znova?",
                    },
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Áno, použiť minulé hodnotenie",
                                emoji: true,
                            },
                            style: "primary",
                            action_id: "reuse_last_vote",
                            value: JSON.stringify(lastVote),
                        },
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Nie, vytvoriť nové hodnotenie",
                                emoji: true,
                            },
                            action_id: "create_new_vote",
                        },
                    ],
                }
            );

            await respond({ blocks });
            return;
        }

        // If no last vote exists, or user chose to create new, show regular form
        blocks.push(
            {
                type: "input",
                block_id: "satisfaction_scale",
                label: {
                    type: "plain_text",
                    text: "Spokojnosť (1 nízka - 10 vysoká):", // Or 0-10, as you prefer
                    emoji: true,
                },
                element: {
                    type: "static_select",
                    action_id: "select_satisfaction",
                    placeholder: {
                        type: "plain_text",
                        text: "Vyberte hodnotu",
                        emoji: true,
                    },
                    options: Array.from({ length: 10 }, (_, i) => ({
                        // Options 1-10
                        text: {
                            type: "plain_text",
                            text: (i + 1).toString(), // +1 to start from 1
                            emoji: true,
                        },
                        value: (i + 1).toString(),
                    })),
                },
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
                    text: "Čo by si na projekte zlepšil?",
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
            }
        );
        await respond({ blocks });
    } catch (error) {
        console.error("Error sending message:", error);
    }
});

// Handle reuse last vote action
app.action("reuse_last_vote", async ({ ack, body, action, client }) => {
    await ack();

    try {
        const lastVote = JSON.parse(action.value);
        const userId = body.user.id;
        const project = body?.channel?.name;

        // Check if already voted this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const existingVote = await db
            .select()
            .from(votes)
            .where(
                and(
                    eq(votes.userId, userId),
                    eq(votes.project, project),
                    gte(votes.createdAt, startOfMonth),
                    lte(votes.createdAt, endOfMonth)
                )
            )
            .limit(1);

        if (existingVote.length > 0) {
            throw new Error("Už ste v tomto mesiaci hlasovali.");
        }

        // Insert new vote with last month's data
        await db.insert(votes).values({
            userId,
            project,
            satisfaction: lastVote.satisfaction,
            fieldsOfInterest: lastVote.fieldsOfInterest,
            additionalFeedback: lastVote.additionalFeedback,
        });

        // Calculate and add points (reuse existing streak logic)
        const streak = await getVotingStreak(userId, project, now);
        const basePoints = 100;
        const coefficient = 1 + 0.1 * (streak - 1);
        const points_earned = Math.round(basePoints * coefficient);

        await db.insert(points).values({
            userId,
            project,
            points: points_earned,
        });

        // Send confirmation
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text:
                `✅ Vaše hodnotenie z minulého mesiaca bolo úspešne použité!\n` +
                `Spokojnosť: ${lastVote.satisfaction}/10\n` +
                `Oblasti: ${lastVote.fieldsOfInterest.join(", ")}\n` +
                `Spätná väzba: ${lastVote.additionalFeedback}\n\n` +
                `🎯 Získali ste ${points_earned} bodov! (${streak}. mesiac v rade)`,
        });
    } catch (error) {
        console.error("Error reusing last vote:", error);
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: `Prepáčte, nastala chyba: ${error.message}`,
        });
    }
});

// Handle create new vote action
app.action("create_new_vote", async ({ ack, body, client }) => {
    await ack();

    try {
        // Show regular voting form
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `Hlasovanie: ${body.channel.name}`,
                    emoji: true,
                },
            },
            {
                type: "input",
                block_id: "satisfaction_scale",
                label: {
                    type: "plain_text",
                    text: "\"Spokojnosť (1 nízka - 10 vysoká):", // Or 0-10, as you prefer
                    emoji: true,
                },
                element: {
                    type: "static_select",
                    action_id: "select_satisfaction",
                    placeholder: {
                        type: "plain_text",
                        text: "Vyberte hodnotu",
                        emoji: true,
                    },
                    options: Array.from({ length: 10 }, (_, i) => ({
                        // Options 1-10
                        text: {
                            type: "plain_text",
                            text: (i + 1).toString(), // +1 to start from 1
                            emoji: true,
                        },
                        value: (i + 1).toString(),
                    })),
                },
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
                    text: "Čo by si na projekte zlepšil?",
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
        ];

        await client.chat.postMessage({
            channel: body.channel.id,
            blocks: blocks,
        });
    } catch (error) {
        console.error("Error showing voting form:", error);
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: "❌ Nastala chyba pri zobrazení formulára. Skúste to prosím znova.",
        });
    }
});

// Handle /reset-points command
app.command("/pnps-reset", async ({ command, ack, respond }) => {
    await ack();

    try {
        // Get channel info to use as project name
        const channelInfo = await app.client.conversations.info({
            channel: command.channel_id,
        });

        const projectName = channelInfo.channel?.name || "Neznámy projekt";

        // Reset points for the current project
        await db.delete(points).where(eq(points.project, projectName));

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

// Handle /pnps-results command
app.command("/pnps-results", async ({ command, ack, respond }) => {
    await ack();

    try {
        // Get channel info to use as project name
        const channelInfo = await app.client.conversations.info({
            channel: command.channel_id,
        });

        const projectName = channelInfo.channel?.name || "Neznámy projekt";

        // Calculate current month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Query votes for current month and project
        const monthlyVotes = await db
            .select()
            .from(votes)
            .where(
                and(
                    eq(votes.project, projectName),
                    gte(votes.createdAt, startOfMonth),
                    lte(votes.createdAt, endOfMonth)
                )
            );

        if (monthlyVotes.length === 0) {
            await respond({
                text: `Žiadne hodnotenia pre projekt ${projectName} v tomto mesiaci neboli nájdené.`,
                response_type: "in_channel",
            });
            return;
        }

        // Calculate average satisfaction
        const avgSatisfaction = (
            monthlyVotes.reduce(
                (sum, vote) => sum + Number(vote.satisfaction),
                0
            ) / monthlyVotes.length
        ).toFixed(1);

        // Prepare results message
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `📊 Výsledky hodnotení: ${projectName}`,
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Obdobie:* ${startOfMonth.toLocaleDateString(
                        "sk-SK"
                    )} - ${endOfMonth.toLocaleDateString(
                        "sk-SK"
                    )}\n*Počet hodnotení:* ${
                        monthlyVotes.length
                    }\n*Priemerná spokojnosť:* ${avgSatisfaction}/10`,
                },
            },
            {
                type: "divider",
            },
        ];

        // Add individual votes
        monthlyVotes.forEach((vote, index) => {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text:
                        `*Hodnotenie #${index + 1}*\n` +
                        `• Spokojnosť: ${vote.satisfaction}/10\n` +
                        `• Oblasti: ${vote.fieldsOfInterest.join(", ")}\n` +
                        `• Feedback: ${
                            vote.additionalFeedback || "Bez komentára"
                        }\n` +
                        `• Dátum: ${vote.createdAt.toLocaleDateString(
                            "sk-SK"
                        )}`,
                },
            });
            blocks.push({
                type: "divider",
            });
        });

        await respond({
            blocks: blocks,
            response_type: "in_channel",
        });
    } catch (error) {
        console.error("Error fetching results:", error);
        await respond({
            text: "❌ Nastala chyba pri získavaní výsledkov. Skúste to prosím znova.",
            response_type: "ephemeral",
        });
    }
});

// Handle /pnps-top-users command
app.command("/pnps-top-users", async ({ command, ack, respond, client }) => {
    await ack();

    try {
        // Get channel info to use as project name
        const channelInfo = await app.client.conversations.info({
            channel: command.channel_id,
        });

        const projectName = channelInfo.channel?.name || "Neznámy projekt";

        // Query top 3 users by points for the project
        const topUsers = await db
            .select({
                userId: points.userId,
                totalPoints: sql`sum(${points.points})`.as("total_points"),
            })
            .from(points)
            .where(eq(points.project, projectName))
            .groupBy(points.userId)
            .orderBy(sql`total_points desc`)
            .limit(3);

        if (topUsers.length === 0) {
            await respond({
                text: `Žiadne body neboli zatiaľ pridelené v projekte ${projectName}.`,
                response_type: "in_channel",
            });
            return;
        }

        // Get user info for each top user
        const userInfoPromises = topUsers.map((user) =>
            client.users.info({ user: user.userId })
        );
        const userInfos = await Promise.all(userInfoPromises);

        // Prepare medals
        const medals = ["🥇", "🥈", "🥉"];

        // Format message blocks
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `👑 Top používatelia: ${projectName}`,
                    emoji: true,
                },
            },
            {
                type: "divider",
            },
        ];

        // Add user entries
        topUsers.forEach((user, index) => {
            const userInfo = userInfos[index].user;
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${medals[index]} *${index + 1}. miesto*: <@${
                        user.userId
                    }> (${userInfo.real_name})\n💎 Body: ${user.totalPoints}`,
                },
            });
        });

        await respond({
            blocks: blocks,
            response_type: "in_channel",
        });
    } catch (error) {
        console.error("Error fetching top users:", error);
        await respond({
            text: "❌ Nastala chyba pri získavaní rebríčka používateľov. Skúste to prosím znova.",
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

// Helper function to get voting streak
async function getVotingStreak(userId, project, currentDate) {
    let streak = 1;
    let checkDate = new Date(currentDate);

    while (true) {
        // Move to previous month
        checkDate.setMonth(checkDate.getMonth() - 1);
        const startOfMonth = new Date(
            checkDate.getFullYear(),
            checkDate.getMonth(),
            1
        );
        const endOfMonth = new Date(
            checkDate.getFullYear(),
            checkDate.getMonth() + 1,
            0
        );

        // Check if there was a vote in this month
        const vote = await db
            .select()
            .from(votes)
            .where(
                and(
                    eq(votes.userId, userId),
                    eq(votes.project, project),
                    gte(votes.createdAt, startOfMonth),
                    lte(votes.createdAt, endOfMonth)
                )
            )
            .limit(1);

        if (vote.length === 0) {
            break;
        }

        streak++;
    }

    return streak;
}

// Handle form submission
app.action("submit_voting", async ({ ack, body, client }) => {
    await ack();

    try {
        const userId = body.user.id;
        const project = body?.channel?.name;

        // Calculate current month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Check for existing vote this month
        const existingVote = await db
            .select()
            .from(votes)
            .where(
                and(
                    eq(votes.userId, userId),
                    eq(votes.project, project),
                    gte(votes.createdAt, startOfMonth),
                    lte(votes.createdAt, endOfMonth)
                )
            )
            .limit(1);

        if (existingVote.length > 0) {
            throw new Error("Už ste v tomto mesiaci hlasovali.");
        }

        const satisfactionScale =
            body.state.values.satisfaction_scale.select_satisfaction
                .selected_option.value;
        const fieldsOfInterest =
            body.state.values.fieldsOfInterest.select_fields.selected_options.map(
                (option) => option.text.text
            );
        const additionalFeedback =
            body.state.values.additional_feedback.feedback_input.value;

        // Save the vote
        await db.insert(votes).values({
            userId,
            project,
            satisfaction: satisfactionScale,
            fieldsOfInterest,
            additionalFeedback,
        });

        // Calculate streak and points
        const streak = await getVotingStreak(userId, project, now);
        const basePoints = 100;
        const coefficient = 1 + 0.1 * (streak - 1);
        const points_earned = Math.round(basePoints * coefficient);

        // Add points to the user
        await db.insert(points).values({
            userId,
            project,
            points: points_earned,
        });

        // Format selected fields for display
        const fieldsText =
            fieldsOfInterest.length > 0
                ? "\nVybrané oblasti: " + fieldsOfInterest.join(", ")
                : "\nŽiadne vybrané oblasti";

        // Send confirmation message with points info
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: `Ďakujeme za vaše hodnotenie projektu ${project}!\nSpokojnosť: ${satisfactionScale}/10${fieldsText}\nSpätná väzba: ${additionalFeedback}\n\n🎯 Získali ste ${points_earned} bodov! (${streak}. mesiac v rade)`,
        });
    } catch (error) {
        console.error("Error processing submission:", error);
        await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: `Prepáčte, nastala chyba pri spracovaní vášho hodnotenia: ${error.message}`,
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
