const fs = require("fs");

const readFileSync = filename => fs.readFileSync(filename).toString("utf8");

// Comma separated list -> array without empty items.
const readList = value =>
  (value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

// Constants
module.exports = {
  database: {
    host: process.env.DATABASE_HOST || "localhost",
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_DB,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD
      ? readFileSync(process.env.DATABASE_PASSWORD)
      : null
  },
  // Sign-in is Google OAuth through Clerk. The backend verifies the Clerk session token (JWT)
  // sent as "Authorization: Bearer <token>".
  auth: {
    // Secret key of the Clerk instance (sk_...). Used to download the signing keys (JWKS).
    secretKey: process.env.CLERK_SECRET_KEY || null,
    // Optional PEM public key (Clerk Dashboard -> API keys -> JWT public key).
    // When set, tokens are verified without any network call. "\n" escapes are allowed.
    jwtKey: process.env.CLERK_JWT_KEY ? process.env.CLERK_JWT_KEY.replace(/\n/g, "\n") : null,
    // Origins of the frontend allowed to use the tokens (checked against the "azp" claim),
    // e.g. "https://t1-pm-unicorn.cloud,http://localhost". Empty = not checked.
    authorizedParties: readList(process.env.CLERK_AUTHORIZED_PARTIES)
  },
  port: process.env.PORT || 81
  // if you're not using docker compose for local development, this will default to 81
  // to prevent non-root permission problems with 80. Dockerfile is set to make this 80
  // because containers don't have that issue :)
};
