const chai = require("chai");
const chaiHttp = require("chai-http");

const app = require("../src/server");

chai.use(chaiHttp);
chai.should();

describe("API /healthz", () => {
  it("it should return 200", done => {
    chai
      .request(app)
      .get("/healthz")
      .end((err, res) => {
        res.should.have.status(200);
        done();
      });
  });
});

describe("API /", () => {
  it("it should return the backend greeting payload", done => {
    chai
      .request(app)
      .get("/")
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        res.should.have.status(200);
        res.body.should.have.property("message");
        res.body.message.should.match(/^Hello from MySQL/);
        done();
      });
  });
});

describe("API /api/history/action", () => {
  const authHeader = "Bearer user-42";

  it("it should log the action and return the generated message", done => {
    chai
      .request(app)
      .post("/api/history/action")
      .set("Authorization", authHeader)
      .send({
        component: "HomePage",
        action: "load",
        user: {
          id: "user-42",
          firstName: "Ada"
        }
      })
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        res.should.have.status(200);
        res.body.should.have.property("ok", true);
        res.body.message.should.include("User: Ada");
        res.body.message.should.include("ID: user-42");
        res.body.message.should.include("performed action: load");
        res.body.message.should.include("Component: HomePage");
        done();
      });
  });

  it("it should reject history access for a different user", done => {
    chai
      .request(app)
      .get("/api/history/action/user-99")
      .set("Authorization", authHeader)
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        res.should.have.status(403);
        res.body.should.have.property("ok", false);
        done();
      });
  });

  it("it should reject storing history for a different user than the authenticated user", done => {
    chai
      .request(app)
      .post("/api/history/action")
      .set("Authorization", authHeader)
      .send({
        component: "SettingsPage",
        action: "save",
        user: {
          id: "user-99",
          firstName: "Mallory"
        }
      })
      .end((err, res) => {
        if (err) {
          done(err);
          return;
        }

        res.should.have.status(403);
        res.body.should.have.property("ok", false);
        done();
      });
  });
});
