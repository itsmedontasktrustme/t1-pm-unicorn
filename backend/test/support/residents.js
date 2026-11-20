/* Test residents: a signed-in Clerk user with a resident row (POST /api/me). */
const chai = require("chai");
const chaiHttp = require("chai-http");

const app = require("../../src/server");
const { bearer } = require("./tokens");
const { uniqueUserId } = require("./db");

chai.use(chaiHttp);

async function signIn(name) {
  const auth = bearer({ sub: uniqueUserId(name.split(" ")[0].toLowerCase()) });
  const res = await chai.request(app).post("/api/me").set("Authorization", auth).send({ name });
  const call = (method, path) => chai.request(app)[method](path).set("Authorization", auth);
  return {
    id: res.body.resident.id,
    name,
    auth,
    get: (path) => call("get", path),
    post: (path, body = {}) => call("post", path).send(body),
    patch: (path, body = {}) => call("patch", path).send(body),
    put: (path, body = {}) => call("put", path).send(body),
    delete: (path) => call("delete", path)
  };
}

module.exports = { app, signIn };
