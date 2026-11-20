const chai = require("chai");
const chaiHttp = require("chai-http");

const app = require("../src/server");
const { bearer } = require("./support/tokens");
const { database, requireDatabase, uniqueUserId } = require("./support/db");

chai.use(chaiHttp);
const { expect } = chai;

describe("HK-55 / HK-58 resident on sign-in (/api/me)", () => {
  it("needs a valid session token", async () => {
    const res = await chai.request(app).post("/api/me").send({ name: "Mallory" });
    expect(res).to.have.status(401);
    expect(res.body).to.include({ ok: false, code: "unauthorized" });
  });

  describe("with the database", () => {
    requireDatabase();

    it("creates the resident on the first sign-in and reuses it later", async () => {
      const sub = uniqueUserId("first");
      const auth = bearer({ sub });

      const first = await chai
        .request(app)
        .post("/api/me")
        .set("Authorization", auth)
        .send({ name: "Hermione Granger", email: "hermione@example.com" });
      expect(first).to.have.status(200);
      expect(first.body.resident).to.include({ name: "Hermione Granger", email: "hermione@example.com" });

      const again = await chai.request(app).post("/api/me").set("Authorization", auth).send({ name: "Hermione J. Granger" });
      expect(again.body.resident.id).to.equal(first.body.resident.id);
      expect(again.body.resident.name).to.equal("Hermione J. Granger");
      expect(again.body.resident.email).to.equal("hermione@example.com");

      const rows = await database("resident").where({ auth_user_id: sub });
      expect(rows).to.have.length(1);
    });

    it("takes the identity from the token, not from the body", async () => {
      const sub = uniqueUserId("token");
      const res = await chai
        .request(app)
        .post("/api/me")
        .set("Authorization", bearer({ sub }))
        .send({ id: "someone_else", name: "Ron Weasley" });

      const row = await database("resident").where({ id: res.body.resident.id }).first();
      expect(row.auth_user_id).to.equal(sub);
    });

    it("GET /api/me before the first sign-in asks to sign in again", async () => {
      const res = await chai.request(app).get("/api/me").set("Authorization", bearer({ sub: uniqueUserId("none") }));
      expect(res).to.have.status(401);
      expect(res.body).to.include({ ok: false, code: "resident-missing" });
    });
  });
});
