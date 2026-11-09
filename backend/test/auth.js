const crypto = require("crypto");
const chai = require("chai");
const chaiHttp = require("chai-http");

const app = require("../src/server");
const authLog = require("../src/logic/authLog");
const { bearer } = require("./support/tokens");

chai.use(chaiHttp);
chai.should();

describe("Authentication (Clerk session token)", () => {
  it("rejects a request without a token", async () => {
    const res = await chai.request(app).get("/api/auth/me");
    res.should.have.status(401);
    res.body.should.have.property("code", "unauthorized");
  });

  it("rejects an unsigned (forged) token that only names a user", async () => {
    const res = await chai.request(app).get("/api/auth/me").set("Authorization", "Bearer user_42");
    res.should.have.status(401);
  });

  it("rejects a token signed by a different key", async () => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const res = await chai.request(app).get("/api/auth/me").set("Authorization", bearer({}, { key: privateKey }));
    res.should.have.status(401);
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const res = await chai
      .request(app)
      .get("/api/auth/me")
      .set("Authorization", bearer({ iat: past - 60, nbf: past - 60, exp: past }));
    res.should.have.status(401);
  });

  it("rejects a token issued for another frontend (azp)", async () => {
    const res = await chai.request(app).get("/api/auth/me").set("Authorization", bearer({ azp: "https://evil.example" }));
    res.should.have.status(401);
  });

  it("accepts a valid token and returns the user and session", async () => {
    const res = await chai.request(app).get("/api/auth/me").set("Authorization", bearer());
    res.should.have.status(200);
    res.body.should.include({ ok: true, userId: "user_42", sessionId: "sess_42" });
  });
});

describe("Authorization", () => {
  it("forbids reading another resident's history", async () => {
    const res = await chai.request(app).get("/api/history/action/user_99").set("Authorization", bearer());
    res.should.have.status(403);
    res.body.should.have.property("ok", false);
  });

  it("forbids storing history for another resident", async () => {
    const res = await chai
      .request(app)
      .post("/api/history/action")
      .set("Authorization", bearer())
      .send({ component: "SettingsPage", action: "save", user: { id: "user_99", firstName: "Mallory" } });
    res.should.have.status(403);
  });

  it("requires a token for history", async () => {
    const res = await chai.request(app).get("/api/history/action/user_42");
    res.should.have.status(401);
  });
});

describe("Sign-in / sign-out logging", () => {
  const originalRecord = authLog.recordAuthEvent;
  let recorded;

  beforeEach(() => {
    recorded = [];
    authLog.recordAuthEvent = async (details) => {
      recorded.push(details);
      return { message: authLog.formatAuthLogMessage(details), recorded: true, persisted: true };
    };
  });

  afterEach(() => {
    authLog.recordAuthEvent = originalRecord;
  });

  it("logs a sign-in with the identity from the token, not from the body", async () => {
    const res = await chai
      .request(app)
      .post("/api/auth/sign-in")
      .set("Authorization", bearer())
      .set("User-Agent", "mocha")
      .send({ user: { id: "user_99", fullName: "Ada Lovelace" } });

    res.should.have.status(200);
    res.body.should.include({ ok: true, event: "sign-in", userId: "user_42", sessionId: "sess_42" });
    recorded.should.have.length(1);
    recorded[0].should.include({ event: "sign-in", userId: "user_42", sessionId: "sess_42", userName: "Ada Lovelace", userAgent: "mocha" });
  });

  it("logs a sign-out", async () => {
    const res = await chai.request(app).post("/api/auth/sign-out").set("Authorization", bearer({ sid: "sess_7" }));

    res.should.have.status(200);
    res.body.should.include({ event: "sign-out", sessionId: "sess_7" });
    recorded[0].should.include({ event: "sign-out", userId: "user_42", sessionId: "sess_7" });
  });

  it("does not log anything for an unauthenticated call", async () => {
    const res = await chai.request(app).post("/api/auth/sign-in");
    res.should.have.status(401);
    recorded.should.have.length(0);
  });

  it("formats the log line with user, event and session", () => {
    const line = authLog.formatAuthLogMessage({
      event: "sign-in",
      userId: "user_42",
      userName: "Ada",
      sessionId: "sess_42",
      ipAddress: "10.0.0.1"
    });
    line.should.match(/User: Ada, ID: user_42, performed action: sign-in on Component: Auth \(session: sess_42, ip: 10\.0\.0\.1\)$/);
  });
});
