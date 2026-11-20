/*
 * Test-only Clerk-like session tokens: an RSA key pair is generated per test run,
 * its public key is given to the backend as CLERK_JWT_KEY (see setup.js) and
 * tokens are signed with the private key, exactly like Clerk signs them (RS256).
 */
const crypto = require("crypto");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });

const PUBLIC_KEY_PEM = publicKey.export({ type: "spki", format: "pem" });
const AUTHORIZED_PARTY = "http://localhost";

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function signToken(claims = {}, { key = privateKey, header = {} } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://test.clerk.accounts.dev",
    azp: AUTHORIZED_PARTY,
    sub: "user_42",
    sid: "sess_42",
    iat: now,
    nbf: now - 5,
    exp: now + 60,
    ...claims
  };
  const encodedHeader = base64url({ alg: "RS256", typ: "JWT", kid: "ins_test", ...header });
  const encodedPayload = base64url(payload);
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedPayload}`), key).toString("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function bearer(claims, options) {
  return `Bearer ${signToken(claims, options)}`;
}

module.exports = { PUBLIC_KEY_PEM, AUTHORIZED_PARTY, signToken, bearer };
