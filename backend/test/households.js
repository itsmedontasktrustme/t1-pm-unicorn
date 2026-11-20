const { expect } = require("chai");

const { database, requireDatabase } = require("./support/db");
const { signIn } = require("./support/residents");

/** Adds an existing resident to a household directly in the database. */
async function addMember(householdId, resident, { status = "member", roles = [] } = {}) {
  const [housemateId] = await database("housemate").insert({ household_id: householdId, resident_id: resident.id, status });
  if (roles.length > 0) {
    await database("housemate_role").insert(roles.map((role) => ({ housemate_id: housemateId, role })));
  }
}

describe("HK-61 / HK-64 / HK-67 households", () => {
  requireDatabase();

  let owner;
  let housemate;
  let stranger;
  let household;

  before(async () => {
    owner = await signIn("Molly Weasley");
    housemate = await signIn("Ginny Weasley");
    stranger = await signIn("Draco Malfoy");
    const res = await owner.post("/api/households", { name: "  The Burrow ", description: "Ottery St Catchpole" });
    household = res.body.household;
    await addMember(household.id, housemate);
  });

  describe("US1 create", () => {
    it("creates the household; the creator is owner and manager", async () => {
      expect(household).to.include({ name: "The Burrow", description: "Ottery St Catchpole" });

      const res = await owner.get(`/api/households/${household.id}`);
      expect(res).to.have.status(200);
      const me = res.body.household.members.find((member) => member.id === owner.id);
      expect(me.roles).to.deep.equal(["owner", "manager"]);
      expect(res.body.household.meId).to.equal(owner.id);
    });

    it("needs a name of at most 20 characters", async () => {
      for (const name of ["", "   ", "x".repeat(21)]) {
        const res = await owner.post("/api/households", { name });
        expect(res).to.have.status(400);
        expect(res.body).to.include({ code: "invalid", error: "Please enter a household name (max 20 characters)" });
        expect(res.body.fields).to.have.property("name");
      }
    });

    it("allows a description of at most 255 characters", async () => {
      const res = await owner.post("/api/households", { name: "Shell Cottage", description: "x".repeat(256) });
      expect(res).to.have.status(400);
      expect(res.body.fields).to.deep.equal({ description: "The description can have at most 255 characters" });
    });
  });

  describe("HK-61 household view", () => {
    it("lists the resident's households", async () => {
      const res = await housemate.get("/api/households");
      expect(res.body.households).to.deep.include({ id: household.id, name: "The Burrow" });
    });

    it("shows members with roles and cookies from DONE tasks", async () => {
      await database("task").insert([
        { household_id: household.id, name: "De-gnome the garden", cookies: 5, status: "done", assignee_id: housemate.id, manager_id: owner.id, completed_dt: new Date(), completed_by: housemate.id },
        { household_id: household.id, name: "Feed the chickens", cookies: 3, status: "todo", assignee_id: housemate.id, manager_id: owner.id }
      ]);

      const res = await housemate.get(`/api/households/${household.id}`);
      const { members, tasks } = res.body.household;
      expect(members.map((member) => member.name)).to.deep.equal(["Molly Weasley", "Ginny Weasley"]);
      expect(members[1]).to.deep.include({ roles: ["housemate"], cookies: 5 });
      expect(tasks.map((task) => [task.title, task.status])).to.deep.equal([
        ["De-gnome the garden", "done"],
        ["Feed the chickens", "assigned"]
      ]);
    });

    it("is not found for someone who is not a member", async () => {
      for (const path of [`/api/households/${household.id}`, "/api/households/999999999", "/api/households/abc"]) {
        const res = await stranger.get(path);
        expect(res).to.have.status(404);
        expect(res.body).to.include({ ok: false, code: "not-found" });
      }
    });

    it("hides the household from an invitee that was not accepted yet", async () => {
      const invitee = await signIn("Luna Lovegood");
      await addMember(household.id, invitee, { status: "invitee" });

      expect((await invitee.get("/api/households")).body.households).to.deep.equal([]);
      expect(await invitee.get(`/api/households/${household.id}`)).to.have.status(404);
    });
  });

  describe("HK-67 profiles", () => {
    it("shows the resident's roles and cookies in each household", async () => {
      const res = await housemate.get("/api/me/households");
      expect(res.body.memberships).to.deep.equal([{ id: household.id, name: "The Burrow", roles: ["housemate"], cookies: 5 }]);
    });

    it("shows a housemate's profile with current and completed tasks", async () => {
      const res = await owner.get(`/api/households/${household.id}/members/${housemate.id}`);
      const { profile } = res.body;
      expect(profile.member.name).to.equal("Ginny Weasley");
      expect(profile.viewerIsOwner).to.equal(true);
      expect(profile.stats).to.deep.equal({ assignedNow: 1, done: 1, doneThisWeek: 1 });
    });

    it("does not show a profile of someone outside the household", async () => {
      const res = await owner.get(`/api/households/${household.id}/members/${stranger.id}`);
      expect(res).to.have.status(404);
    });
  });
});
