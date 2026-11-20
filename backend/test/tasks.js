const { expect } = require("chai");

const { database, requireDatabase } = require("./support/db");
const { signIn } = require("./support/residents");

const DAY = 24 * 60 * 60 * 1000;

describe("HK-73 / HK-76 / HK-79 / HK-82 / HK-85 tasks (US5–US9)", () => {
  requireDatabase();

  let owner; // owner and manager, creates the tasks
  let ron; // second manager
  let ginny; // housemate
  let stranger;
  let household;
  let base;

  const create = (by, body) => by.post(base, body);
  const act = (by, task, action, body) => by.post(`${base}/${task.id}/${action}`, body);

  beforeEach(async () => {
    owner = await signIn("Molly Weasley");
    ron = await signIn("Ron Weasley");
    ginny = await signIn("Ginny Weasley");
    stranger = await signIn("Draco Malfoy");
    household = (await owner.post("/api/households", { name: "The Burrow" })).body.household;
    base = `/api/households/${household.id}/tasks`;
    for (const resident of [ron, ginny]) {
      await database("housemate").insert({ household_id: household.id, resident_id: resident.id, status: "member" });
    }
    await owner.post(`/api/households/${household.id}/members/${ron.id}/role`, { action: "grant-manager" });
  });

  describe("US5 create", () => {
    it("creates a TO DO task; the creator is the responsible manager; cookies 1 by default", async () => {
      const res = await create(owner, { title: " De-gnome the garden ", description: "All of them" });
      expect(res).to.have.status(200);
      expect(res.body.task).to.include({
        title: "De-gnome the garden",
        status: "available",
        cookies: 1,
        managerId: owner.id,
        managerName: "Molly Weasley",
        assigneeId: null
      });
    });

    it("can assign right away to a housemate, also to themselves", async () => {
      const res = await create(owner, { title: "Feed the chickens", assigneeId: ginny.id, cookies: 3 });
      expect(res.body.task).to.include({ status: "assigned", assigneeId: ginny.id, assigneeName: "Ginny Weasley", cookies: 3 });
    });

    it("7a / 7c / 7d: texts per field", async () => {
      const res = await create(owner, { title: "", cookies: 101, description: "x".repeat(2001) });
      expect(res).to.have.status(400);
      expect(res.body.fields).to.deep.equal({
        title: "Please enter a task name (max 100 characters)",
        cookies: "The number of cookies must be a whole number from 1 to 100",
        description: "The description can have at most 2000 characters"
      });
      for (const cookies of [0, 2.5, "abc"]) {
        expect((await create(owner, { title: "x", cookies })).body.fields).to.have.property("cookies");
      }
      expect(await create(owner, { title: "x".repeat(101) })).to.have.status(400);
      expect(await create(owner, { title: "x", cookies: 100 })).to.have.status(200);
    });

    it("7b: the assignee must be a housemate of this household", async () => {
      const res = await create(owner, { title: "Mop", assigneeId: stranger.id });
      expect(res).to.have.status(400);
      expect(res.body.error).to.equal("A task can only be assigned to a housemate of this household");
    });

    it("a housemate cannot create tasks; a stranger does not see the household", async () => {
      expect(await create(ginny, { title: "Mop" })).to.have.status(403);
      expect(await create(stranger, { title: "Mop" })).to.have.status(404);
      expect(await stranger.get(base)).to.have.status(404);
    });
  });

  describe("US6 edit, delete, hand over", () => {
    let task;
    beforeEach(async () => {
      task = (await create(owner, { title: "Wash the dishes", cookies: 2 })).body.task;
    });

    it("the responsible manager edits a TO DO task", async () => {
      const res = await owner.patch(`${base}/${task.id}`, { title: "Wash and dry the dishes", cookies: 4, due: "2030-01-01T18:00:00.000Z" });
      expect(res.body.task).to.include({ title: "Wash and dry the dishes", cookies: 4, due: "2030-01-01T18:00:00.000Z" });
    });

    it("7a: another manager cannot edit or delete it", async () => {
      const edit = await ron.patch(`${base}/${task.id}`, { title: "Mine now" });
      expect(edit).to.have.status(403);
      expect(edit.body.error).to.equal("Only the responsible manager can edit this task");
      expect(await ron.delete(`${base}/${task.id}`)).to.have.status(403);
    });

    it("7b: a DONE task cannot be edited or deleted", async () => {
      await act(owner, task, "assign", { assigneeId: ginny.id });
      await act(ginny, task, "done");
      const edit = await owner.patch(`${base}/${task.id}`, { title: "New" });
      expect(edit.body.error).to.equal("A task with the status DONE cannot be edited");
      const del = await owner.delete(`${base}/${task.id}`);
      expect(del.body.error).to.equal("A task with the status DONE cannot be deleted");
    });

    it("4a–4b: the responsible manager deletes a TO DO task", async () => {
      expect(await owner.delete(`${base}/${task.id}`)).to.have.status(200);
      expect(await owner.patch(`${base}/${task.id}`, { title: "x" })).to.have.status(404);
    });

    it("4c–4d: hands responsibility over to another manager", async () => {
      const res = await act(owner, task, "hand-over", { managerId: ron.id });
      expect(res.body.task).to.include({ managerId: ron.id, managerName: "Ron Weasley" });
      // Now only Ron edits it.
      expect(await owner.patch(`${base}/${task.id}`, { title: "x" })).to.have.status(403);
      expect(await ron.patch(`${base}/${task.id}`, { title: "Ron's dishes" })).to.have.status(200);
    });

    it("4e: responsibility goes only to a manager of this household", async () => {
      for (const target of [ginny, stranger]) {
        const res = await act(owner, task, "hand-over", { managerId: target.id });
        expect(res).to.have.status(400);
        expect(res.body.error).to.equal("Responsibility can only be handed over to a manager of this household");
      }
    });
  });

  describe("US7 assign", () => {
    let task;
    beforeEach(async () => {
      task = (await create(owner, { title: "Polish the clock" })).body.task;
    });

    it("assigns and reassigns; the status stays TO DO", async () => {
      expect((await act(owner, task, "assign", { assigneeId: ginny.id })).body.task).to.include({ status: "assigned", assigneeId: ginny.id });
      expect((await act(owner, task, "assign", { assigneeId: owner.id })).body.task).to.include({ assigneeId: owner.id });
    });

    it("6a: only the responsible manager assigns", async () => {
      const res = await act(ron, task, "assign", { assigneeId: ginny.id });
      expect(res).to.have.status(403);
      expect(res.body.error).to.equal("Only the responsible manager can assign this task");
    });

    it("6b / 6c: not a DONE task, only a housemate", async () => {
      expect((await act(owner, task, "assign", { assigneeId: stranger.id })).body.error).to.equal(
        "A task can only be assigned to a housemate of this household"
      );
      await act(owner, task, "assign", { assigneeId: ginny.id });
      await act(ginny, task, "done");
      expect((await act(owner, task, "assign", { assigneeId: ron.id })).body.error).to.equal(
        "A task with the status DONE cannot be assigned"
      );
    });
  });

  describe("US8 pick up, give back", () => {
    let task;
    beforeEach(async () => {
      task = (await create(owner, { title: "Water the plants" })).body.task;
    });

    it("a housemate picks up a task without an assignee and gives it back", async () => {
      expect((await act(ginny, task, "pick-up")).body.task).to.include({ assigneeId: ginny.id, status: "assigned" });
      expect((await act(ginny, task, "give-back")).body.task).to.include({ assigneeId: null, status: "available" });
    });

    it("5a: a task with an assignee or DONE cannot be picked up", async () => {
      await act(ginny, task, "pick-up");
      const res = await act(ron, task, "pick-up");
      expect(res).to.have.status(409);
      expect(res.body.error).to.equal("This task already has an assignee");
    });

    it("only the assignee gives a task back", async () => {
      await act(ginny, task, "pick-up");
      expect(await act(owner, task, "give-back")).to.have.status(403);
    });
  });

  describe("US9 mark as done, return", () => {
    it("only the assignee marks it done and gets the cookies (no due date)", async () => {
      const task = (await create(owner, { title: "Sweep", cookies: 5, assigneeId: ginny.id })).body.task;

      const notAssignee = await act(owner, task, "done");
      expect(notAssignee).to.have.status(403);
      expect(notAssignee.body.error).to.equal("Only the assignee can mark this task as done");

      const res = await act(ginny, task, "done");
      expect(res.body.credited).to.equal(5);
      expect(res.body.task).to.include({ status: "done", creditedCookies: 5, markedById: ginny.id });

      const view = await ginny.get(`/api/households/${household.id}`);
      expect(view.body.household.members.find((member) => member.id === ginny.id).cookies).to.equal(5);
    });

    it("5b: a task without an assignee cannot be marked as done", async () => {
      const task = (await create(owner, { title: "Sweep" })).body.task;
      const res = await act(owner, task, "done");
      expect(res).to.have.status(400);
      expect(res.body.error).to.equal("Assign the task before marking it as done");
    });

    it("7.1: no cookies when it is done after the due date", async () => {
      const task = (await create(owner, { title: "Late laundry", cookies: 4, assigneeId: ginny.id })).body.task;
      await database("task").where({ id: task.id }).update({ due_dt: new Date(Date.now() - DAY) });

      const res = await act(ginny, task, "done");
      expect(res.body.credited).to.equal(0);
      const view = await ginny.get(`/api/households/${household.id}`);
      expect(view.body.household.members.find((member) => member.id === ginny.id).cookies).to.equal(0);
    });

    it("cookies when it is done before the due date", async () => {
      const due = new Date(Date.now() + DAY).toISOString();
      const task = (await create(owner, { title: "Early laundry", cookies: 4, assigneeId: ginny.id, due })).body.task;
      expect((await act(ginny, task, "done")).body.credited).to.equal(4);
    });

    it("4a–4b: the responsible manager returns a DONE task; the assignee stays, cookies no longer count", async () => {
      const task = (await create(owner, { title: "Iron", cookies: 3, assigneeId: ginny.id })).body.task;
      await act(ginny, task, "done");

      const notResponsible = await act(ron, task, "return");
      expect(notResponsible).to.have.status(403);
      expect(notResponsible.body.error).to.equal("Only the responsible manager can return a completed task");

      const res = await act(owner, task, "return");
      expect(res.body.task).to.include({ status: "assigned", assigneeId: ginny.id, creditedCookies: 0, completedAt: null });
      const view = await ginny.get(`/api/households/${household.id}`);
      expect(view.body.household.members.find((member) => member.id === ginny.id).cookies).to.equal(0);
    });
  });

  it("HK-73 list: tasks, housemates and who the resident is", async () => {
    await create(owner, { title: "One" });
    const res = await ginny.get(base);
    expect(res.body.tasks.map((task) => task.title)).to.deep.equal(["One"]);
    expect(res.body.me).to.deep.equal({ id: ginny.id, name: "Ginny Weasley" });
    expect(res.body.isManager).to.equal(false);
    expect(res.body.members).to.have.length(3);
  });

  it("removing the manager role moves responsibility to the owner (US4)", async () => {
    const task = (await create(ron, { title: "Ron's task" })).body.task;
    await owner.post(`/api/households/${household.id}/members/${ron.id}/role`, { action: "remove-manager" });
    const res = await owner.get(base);
    expect(res.body.tasks.find((item) => item.id === task.id).managerId).to.equal(owner.id);
  });
});
