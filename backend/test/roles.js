const { expect } = require("chai");

const { database, requireDatabase } = require("./support/db");
const { signIn } = require("./support/residents");

describe("HK-52 US4 managing roles", () => {
  requireDatabase();

  let owner;
  let ron;
  let hermione;
  let household;
  const role = (by, member, action) => by.post(`/api/households/${household.id}/members/${member.id}/role`, { action });
  const rolesOf = (res, member) => res.body.household.members.find((item) => item.id === member.id).roles;

  beforeEach(async () => {
    owner = await signIn("Harry Potter");
    ron = await signIn("Ron Weasley");
    hermione = await signIn("Hermione Granger");
    household = (await owner.post("/api/households", { name: "Gryffindor Tower" })).body.household;
    for (const resident of [ron, hermione]) {
      await database("housemate").insert({ household_id: household.id, resident_id: resident.id, status: "member" });
    }
  });

  it("the owner grants and removes the manager role", async () => {
    const granted = await role(owner, ron, "grant-manager");
    expect(granted).to.have.status(200);
    expect(rolesOf(granted, ron)).to.deep.equal(["manager"]);

    const removed = await role(owner, ron, "remove-manager");
    expect(rolesOf(removed, ron)).to.deep.equal(["housemate"]);
  });

  it("removing the manager role makes the owner responsible for that manager's tasks", async () => {
    await role(owner, ron, "grant-manager");
    await database("task").insert({ household_id: household.id, name: "Feed the owls", manager_id: ron.id, assignee_id: hermione.id });

    await role(owner, ron, "remove-manager");

    const task = await database("task").where({ household_id: household.id, name: "Feed the owls" }).first();
    expect(String(task.manager_id)).to.equal(owner.id);
    expect(String(task.assignee_id)).to.equal(hermione.id);
  });

  it("after handing over the owner role the previous owner stays a manager", async () => {
    const res = await role(owner, ron, "hand-over-owner");
    expect(rolesOf(res, ron)).to.deep.equal(["owner", "manager"]);
    expect(rolesOf(res, owner)).to.deep.equal(["manager"]);

    // Exactly one owner, and the previous owner cannot change roles anymore.
    const owners = res.body.household.members.filter((member) => member.roles.includes("owner"));
    expect(owners).to.have.length(1);
    const denied = await role(owner, hermione, "grant-manager");
    expect(denied).to.have.status(403);
    expect(denied.body).to.include({ code: "not-owner", error: "Only the owner can change roles." });
  });

  it("6a: the owner cannot remove the manager role from themselves", async () => {
    const res = await role(owner, owner, "remove-manager");
    expect(res).to.have.status(400);
    expect(res.body.error).to.equal("The owner must always be a manager");
  });

  it("6b: the owner cannot give up the owner role without handing it over", async () => {
    const res = await role(owner, owner, "hand-over-owner");
    expect(res).to.have.status(400);
    expect(res.body.error).to.equal("Hand over the owner role to another housemate first");
  });

  it("only the owner changes roles; a manager cannot", async () => {
    await role(owner, ron, "grant-manager");
    const res = await role(ron, hermione, "grant-manager");
    expect(res).to.have.status(403);
  });

  it("rejects an unknown action and a resident outside the household", async () => {
    expect(await role(owner, ron, "make-king")).to.have.status(400);
    const stranger = await signIn("Draco Malfoy");
    expect(await role(owner, stranger, "grant-manager")).to.have.status(404);
  });
});
