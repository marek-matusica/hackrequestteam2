const { defineConfig } = require("drizzle-kit");

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.js",
    out: "./drizzle",
    dbCredentials: {
        host: "localhost",
        user: "postgres",
        password: "mypassword",
        database: "postgres",
        port: 5432,
        ssl: false,
    },
});
