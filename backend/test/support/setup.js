// Loaded by mocha before any test file (.mocharc.json), i.e. before src/config.js reads the env.
const { PUBLIC_KEY_PEM, AUTHORIZED_PARTY } = require("./tokens");

process.env.CLERK_JWT_KEY = PUBLIC_KEY_PEM;
process.env.CLERK_AUTHORIZED_PARTIES = AUTHORIZED_PARTY;
delete process.env.CLERK_SECRET_KEY;
