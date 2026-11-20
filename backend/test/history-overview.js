const { expect } = require("chai");

const { database, requireDatabase } = require("./support/db");
const { signIn } = require("./support/residents");

const DAY = 24 * 60 * 60 * 1000;

describe("HK-88 / HK-91 history overview (US10)", () => {
  requireDatabase();

  let owner;
  let ginny;
  let stranger;
  let burrow;
  let shell;

  const done = async (by, household, title, cookies, assignee, options = {}) => {
    const task = (await by.post(`/api/households/${household.id}/tasks`, { title, cookies, assigneeId: assignee.id })).body.task;
    if (options.late) {
      await database("task").where({ id: task.id }).update({ due_dt: new Date(Date.now() - DAY) });
    }
    await assignee.post(`/api/households/${household.id}/tasks/${task.id}/done`);
    return task;
  };

  beforeEach(async () => {
    owner = await signIn("Molly Weasley");
    ginny = await signIn("Ginny Weasley");
    stranger = await signIn("Draco Malfoy");
    burrow = (await owner.post("/api/households", { name: "The Burrow" })).body.household;
    shell = (await owner.post("/api/households", { name: "Shell Cottage" })).body.household;
    for (const household of [burrow, shell]) {
      await database("housemate").insert({ household_id: household.id, resident_id: ginny.id, status: "member" });
    }

    await done(owner, burrow, "De-gnome the garden", 5, ginny);
    await done(owner, burrow, "Feed the chickens", 3, owner);
    await done(owner, burrow, "Late laundry", 4, ginny, { late: true });
    await done(owner, shell, "Sweep the porch", 2, ginny);
    // Not done: does not count.
    await owner.post(`/api/households/${burrow.id}/tasks`, { title: "Open task", cookies: 9, assigneeId: ginny.id });
  });

  it("household: completed tasks newest first, who marked them done and the credited cookies", async () => {
    const res = await ginny.get(`/api/households/${burrow.id}/history`);
    expect(res).to.have.status(200);
    const { history } = res.body;

    expect(history.householdName).to.equal("The Burrow");
    expect(history.meId).to.equal(ginny.id);
    expect(history.completed.map((item) => [item.title, item.cookies])).to.deep.equal([
      ["Late laundry", 0],
      ["Feed the chickens", 3],
      ["De-gnome the garden", 5]
    ]);
    expect(history.completed[2]).to.include({ memberId: ginny.id, assigneeName: "Ginny Weasley", markedById: ginny.id });
    expect(history.totals).to.deep.equal([
      { id: ginny.id, name: "Ginny Weasley", cookies: 5 },
      { id: owner.id, name: "Molly Weasley", cookies: 3 }
    ]);
  });

  it("resident: own completed tasks and cookies in every household", async () => {
    const { history } = (await ginny.get("/api/me/history")).body;
    expect(history.totalCookies).to.equal(7);
    expect(history.perHousehold).to.deep.equal([
      { id: burrow.id, name: "The Burrow", cookies: 5 },
      { id: shell.id, name: "Shell Cottage", cookies: 2 }
    ]);
    expect(history.completed.map((item) => `${item.householdName}: ${item.title}`)).to.have.members([
      "The Burrow: De-gnome the garden",
      "The Burrow: Late laundry",
      "Shell Cottage: Sweep the porch"
    ]);
  });

  it("a returned task no longer counts", async () => {
    const { history: before } = (await ginny.get(`/api/households/${burrow.id}/history`)).body;
    const gnomes = before.completed.find((item) => item.title === "De-gnome the garden");
    await owner.post(`/api/households/${burrow.id}/tasks/${gnomes.id}/return`);

    const { history } = (await ginny.get("/api/me/history")).body;
    expect(history.totalCookies).to.equal(2);
  });

  it("only housemates see the household history", async () => {
    expect(await stranger.get(`/api/households/${burrow.id}/history`)).to.have.status(404);
    const { history } = (await stranger.get("/api/me/history")).body;
    expect(history).to.deep.include({ totalCookies: 0, perHousehold: [], completed: [] });
  });
});
