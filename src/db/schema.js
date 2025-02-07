const {
    pgTable,
    serial,
    text,
    varchar,
    timestamp,
    integer,
} = require("drizzle-orm/pg-core");

const votes = pgTable("votes", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    project: varchar("project").notNull(),
    satisfaction: integer("satisfaction"),
    fieldsOfInterest: text("fields_of_interest").array().notNull(),
    additionalFeedback: text("additional_feedback"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    validTo: timestamp("valid_to"),
});

const points = pgTable("points", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    project: varchar("project").notNull(),
    points: integer("points"),
});

module.exports = {
    votes,
    points,
};
