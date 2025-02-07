const { db } = require("./db");
const { votes } = require("./schema");

const sampleVotes = [
    {
        userId: "U123ABC",
        project: "Project Alpha",
        satisfaction: 8,
        fieldsOfInterest: ["Backend", "API Design"],
        additionalFeedback: "Great learning experience!",
        createdAt: new Date(),
    },
    {
        userId: "U456DEF",
        project: "Project Beta",
        satisfaction: 9,
        fieldsOfInterest: ["Frontend", "UX"],
        additionalFeedback: "Enjoyed working with the team",
        createdAt: new Date(),
    },
    {
        userId: "U789GHI",
        project: "Project Gamma",
        satisfaction: 7,
        fieldsOfInterest: ["Database", "Performance"],
        additionalFeedback: "Challenging but rewarding",
        createdAt: new Date(),
    },
    {
        userId: "U101JKL",
        project: "Project Delta",
        satisfaction: 10,
        fieldsOfInterest: ["Cloud", "DevOps"],
        additionalFeedback: "Amazing project structure",
        createdAt: new Date(),
    },
    {
        userId: "U202MNO",
        project: "Project Epsilon",
        satisfaction: 6,
        fieldsOfInterest: ["Security", "Testing"],
        additionalFeedback: "Need more documentation",
        createdAt: new Date(),
    },
    {
        userId: "U303PQR",
        project: "Project Zeta",
        satisfaction: 9,
        fieldsOfInterest: ["Mobile", "React Native"],
        additionalFeedback: "Excellent coordination",
        createdAt: new Date(),
    },
    {
        userId: "U404STU",
        project: "Project Eta",
        satisfaction: 8,
        fieldsOfInterest: ["AI", "Machine Learning"],
        additionalFeedback: "Innovative approach",
        createdAt: new Date(),
    },
    {
        userId: "U505VWX",
        project: "Project Theta",
        satisfaction: 7,
        fieldsOfInterest: ["Blockchain", "Web3"],
        additionalFeedback: "Good team collaboration",
        createdAt: new Date(),
    },
    {
        userId: "U606YZA",
        project: "Project Iota",
        satisfaction: 9,
        fieldsOfInterest: ["Data Science", "Analytics"],
        additionalFeedback: "Well-organized sprints",
        createdAt: new Date(),
    },
    {
        userId: "U707BCD",
        project: "Project Kappa",
        satisfaction: 8,
        fieldsOfInterest: ["UI Design", "Accessibility"],
        additionalFeedback: "Great mentorship",
        createdAt: new Date(),
    },
];

async function seed() {
    try {
        console.log("Starting to seed votes table...");
        await db.insert(votes).values(sampleVotes);
        console.log("Successfully seeded votes table!");
    } catch (error) {
        console.error("Error seeding votes table:", error);
    } finally {
        process.exit(0);
    }
}

seed();
