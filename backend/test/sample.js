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
  it("it should return Welcome message", done => {
    chai
      .request(app)
      .get("/")
      .end((err, res) => {
        res.should.have.status(200);
        res.should.to.be.html;
        res.text.should.be.equal("Hello Docker World\n");
        done();
      });
  });
});

describe("API /api/history/action", () => {
  it("it should log the action and return the generated message", done => {
    chai
      .request(app)
      .post("/api/history/action")
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
});
