const { App } = require("@slack/bolt");
const { db } = require("./src/db/db");

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
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
