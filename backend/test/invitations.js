const { expect } = require("chai");

const { database, requireDatabase } = require("./support/db");
const { signIn } = require("./support/residents");
const { normalizeCode } = require("../src/logic/invitations");

describe("HK-49 / HK-268 invitations (US2, US3)", () => {
  requireDatabase();

  let owner;
  let luna;
  let household;
  const invite = (by, body) => by.post(`/api/households/${household.id}/invitation`, body);
  const answer = (by, invitee, verb) => by.post(`/api/households/${household.id}/invitees/${invitee.id}/${verb}`);

  beforeEach(async () => {
    owner = await signIn("Minerva McGonagall");
    luna = await signIn("Luna Lovegood");
    household = (await owner.post("/api/households", { name: "Ravenclaw Tower" })).body.household;
  });

  describe("US2 creating a code", () => {
    it("creates a code valid for 7 days by default", async () => {
      const res = await invite(owner, {});
      expect(res).to.have.status(200);
      expect(res.body.invitation.code).to.match(/^HK-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
      const days = (new Date(res.body.invitation.expiresAt) - Date.now()) / 86400000;
      expect(days).to.be.closeTo(7, 0.01);
    });

    it("6a: the validity must be 1 to 14 days", async () => {
      for (const validDays of [0, 15, 2.5, "abc"]) {
        const res = await invite(owner, { validDays });
        expect(res).to.have.status(400);
        expect(res.body.error).to.equal("An invitation must be valid for 1 to 14 days");
      }
      expect(await invite(owner, { validDays: 14 })).to.have.status(200);
    });

    it("a new code replaces the previous one", async () => {
      const first = (await invite(owner, { validDays: 3 })).body.invitation.code;
      const second = (await invite(owner, { validDays: 3 })).body.invitation.code;

      expect((await luna.get(`/api/invitations/${first}`)).body.code).to.equal("invitation-invalid");
      expect((await luna.get(`/api/invitations/${second}`))).to.have.status(200);
      const state = await owner.get(`/api/households/${household.id}/invitation`);
      expect(state.body.invitation.code).to.equal(second);
    });

    it("5a: only the owner can invite", async () => {
      const ron = await signIn("Ron Weasley");
      await database("housemate").insert({ household_id: household.id, resident_id: ron.id, status: "member" });
      const res = await invite(ron, {});
      expect(res).to.have.status(403);
      expect(res.body.error).to.equal("Only the owner can invite residents to this household");
      expect(await ron.get(`/api/households/${household.id}/invitation`)).to.have.status(403);
    });
  });

  describe("US3 joining with a code", () => {
    let code;
    beforeEach(async () => {
      code = (await invite(owner, {})).body.invitation.code;
    });

    it("shows the household for the code (lower case and without dashes too)", async () => {
      const res = await luna.get(`/api/invitations/${code.toLowerCase().replace(/-/g, "")}`);
      expect(res.body.invitation).to.include({ householdName: "Ravenclaw Tower", invitedBy: "Minerva McGonagall", memberCount: 1 });
    });

    it("joins as an Invitee who sees Pending invitation but not the household", async () => {
      const res = await luna.post("/api/invitations/join", { code });
      expect(res.body.pending).to.include({ householdName: "Ravenclaw Tower", status: "invitee" });

      expect((await luna.get("/api/me/pending")).body.pending.map((item) => item.householdName)).to.deep.equal(["Ravenclaw Tower"]);
      expect((await luna.get("/api/households")).body.households).to.deep.equal([]);
      expect(await luna.get(`/api/households/${household.id}`)).to.have.status(404);

      const state = await owner.get(`/api/households/${household.id}/invitation`);
      expect(state.body.invitees.map((item) => item.name)).to.deep.equal(["Luna Lovegood"]);
      // Joining twice does not change anything.
      expect(await luna.post("/api/invitations/join", { code })).to.have.status(200);
    });

    it("the owner accepts: the Invitee becomes a housemate", async () => {
      await luna.post("/api/invitations/join", { code });
      const res = await answer(owner, luna, "accept");
      expect(res.body.invitees).to.deep.equal([]);

      expect((await luna.get("/api/me/pending")).body.pending).to.deep.equal([]);
      const view = await luna.get(`/api/households/${household.id}`);
      expect(view.body.household.members.find((member) => member.id === luna.id).roles).to.deep.equal(["housemate"]);
    });

    it("the owner rejects: the resident is removed and Pending invitation disappears", async () => {
      await luna.post("/api/invitations/join", { code });
      await answer(owner, luna, "reject");

      expect((await luna.get("/api/me/pending")).body.pending).to.deep.equal([]);
      expect(await database("housemate").where({ household_id: household.id, resident_id: luna.id })).to.have.length(0);
      // Answering again: nobody is waiting anymore.
      expect(await answer(owner, luna, "accept")).to.have.status(404);
    });

    it("2a: an unknown or expired code", async () => {
      await database("invitation").where({ code }).update({ expiration_dt: new Date(Date.now() - 1000) });
      for (const value of [code, "HK-0000-00", ""]) {
        const res = await luna.post("/api/invitations/join", { code: value });
        expect(res).to.have.status(404);
        expect(res.body).to.include({
          code: "invitation-invalid",
          error: "This invitation is invalid or has expired. Ask the owner for a new one."
        });
      }
    });

    it("3a: a housemate cannot join again", async () => {
      const res = await owner.post("/api/invitations/join", { code });
      expect(res).to.have.status(409);
      expect(res.body.error).to.equal("You are already a housemate of this household");
    });

    it("only the owner accepts or rejects", async () => {
      await luna.post("/api/invitations/join", { code });
      const ron = await signIn("Ron Weasley");
      await database("housemate").insert({ household_id: household.id, resident_id: ron.id, status: "member" });
      expect(await answer(ron, luna, "accept")).to.have.status(403);
    });
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode(" hk7k2m5p ")).to.equal("HK-7K2M-5P");
    expect(normalizeCode("7K2M-5P")).to.equal("HK-7K2M-5P");
  });
});
