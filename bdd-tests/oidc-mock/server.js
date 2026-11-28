const crypto = require("crypto");
const fs = require("fs");
const http = require("http");

const privateKey = crypto.createPrivateKey(fs.readFileSync("private.pem"));
let nextUser = null;
let sessionCounter = 0;

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

function tokenFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const sessionId = `sess_mock_${++sessionCounter}`;
  const header = base64url({ alg: "RS256", typ: "JWT", kid: "homekeeper-test" });
  const payload = base64url({
    iss: "https://test.clerk.accounts.dev",
    azp: "http://localhost",
    sub: user.sub,
    sid: sessionId,
    iat: now,
    nbf: now - 5,
    exp: now + 300
  });
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return { token: `${signingInput}.${signature}`, sessionId };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});

    if (req.method === "POST" && req.url === "/test/next-user") {
      const user = await body(req);
      if (!user.sub || !user.email) return send(res, 400, { error: "sub and email are required" });
      nextUser = {
        sub: String(user.sub),
        name: user.name || null,
        email: String(user.email),
        createdAt: user.createdAt || null
      };
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/test/token") {
      if (!nextUser) return send(res, 400, { error: "No test user selected" });
      const selected = nextUser;
      nextUser = null;
      const { token, sessionId } = tokenFor(selected);
      return send(res, 200, {
        token,
        sessionId,
        user: {
          id: selected.sub,
          firstName: selected.name || null,
          fullName: selected.name || selected.email.split("@")[0],
          primaryEmailAddress: { emailAddress: selected.email },
          createdAt: selected.createdAt,
          imageUrl: null
        }
      });
    }

    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error.message });
  }
});

server.listen(Number(process.env.PORT || 8080), "0.0.0.0", () => {
  console.log("OIDC test mock listening on port 8080");
});
