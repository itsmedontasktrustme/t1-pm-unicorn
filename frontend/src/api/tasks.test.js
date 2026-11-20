import { resetPlaceholderData } from "./households";
import {
  assignTask,
  createTask,
  deleteTask,
  giveBackTask,
  handOverTask,
  listTasks,
  markTaskDone,
  MESSAGES,
  pickUpTask,
  returnTask,
  updateTask,
  validateTask
} from "./tasks";

const harry = { id: "dev-demo-resident", fullName: "Harry Potter" };
// Harry is owner + manager; responsible for g1, g3, g5 and the done task gc2. Ron is responsible for g2, g4, gc1.
const GRYFFINDOR = "hh-gryffindor";
// Harry is a housemate; Vernon (owner) is responsible for all tasks. t3 is assigned to Harry.
const PRIVET = "hh-private-drive";
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("US5 7a / 7c / 7d: texts from the user story; a past due date is rejected", () => {
  const now = new Date("2026-11-14T12:00:00");
  const { fields } = validateTask({ title: "  ", due: "2026-11-13T18:00:00", cookies: "-1", description: "x".repeat(2001) }, { now });
  expect(fields).toEqual({
    title: "Please enter a task name (max 100 characters)",
    due: "Due date can’t be in the past.",
    cookies: "The number of cookies must be a whole number from 1 to 100",
    description: "The description can have at most 2000 characters"
  });
  expect(validateTask({ title: "x".repeat(101) }).fields.title).toBe(MESSAGES.name);
});

test("US5 7c: cookies are a whole number from 1 to 100, 1 by default", () => {
  for (const cookies of ["0", "101", "2.5", "abc"]) {
    expect(validateTask({ title: "X", cookies }).fields.cookies).toBe(MESSAGES.cookies);
  }
  expect(validateTask({ title: "X", cookies: "1" }).fields.cookies).toBeUndefined();
  expect(validateTask({ title: "X", cookies: "100" }).fields.cookies).toBeUndefined();
  expect(validateTask({ title: "X", cookies: "" }).value.cookies).toBe(1);
});

test("US5: the creator is the responsible manager; without an assignee the task is Available", async () => {
  const free = await createTask(harry, GRYFFINDOR, { title: "Polish the trophies" });
  expect(free).toMatchObject({ status: "available", managerId: harry.id, managerName: "Harry Potter" });

  const assigned = await createTask(harry, GRYFFINDOR, { title: "Fix the stairs", assigneeId: "demo-ron" });
  expect(assigned).toMatchObject({ status: "assigned", assigneeName: "Ron W." });
});

test("US5 7b: the assignee must be a housemate of the household", async () => {
  await expect(createTask(harry, GRYFFINDOR, { title: "X", assigneeId: "demo-vernon" })).rejects.toThrow(MESSAGES.notHousemate);
});

test("a housemate cannot create tasks, and cannot edit or delete tasks of the responsible manager", async () => {
  await expect(createTask(harry, PRIVET, { title: "X" })).rejects.toMatchObject({ code: "not-manager" });
  await expect(updateTask(harry, PRIVET, "t2", { title: "X" })).rejects.toThrow(MESSAGES.onlyResponsibleEdits);
  await expect(deleteTask(harry, PRIVET, "t2")).rejects.toThrow(MESSAGES.onlyResponsibleEdits);
});

test("US6 7a: another manager cannot edit, delete or assign the task", async () => {
  await expect(updateTask(harry, GRYFFINDOR, "g2", { title: "X" })).rejects.toThrow(MESSAGES.onlyResponsibleEdits);
  await expect(deleteTask(harry, GRYFFINDOR, "g2")).rejects.toThrow(MESSAGES.onlyResponsibleEdits);
  await expect(assignTask(harry, GRYFFINDOR, "g2", harry.id)).rejects.toThrow(MESSAGES.onlyResponsibleAssigns);
});

test("US6 4c–4e: responsibility is handed over only to another manager", async () => {
  await expect(handOverTask(harry, GRYFFINDOR, "g1", "demo-hermione")).rejects.toThrow(MESSAGES.handOverToManager);

  const task = await handOverTask(harry, GRYFFINDOR, "g1", "demo-ron");
  expect(task).toMatchObject({ managerId: "demo-ron", managerName: "Ron W." });
  await expect(updateTask(harry, GRYFFINDOR, "g1", { title: "X" })).rejects.toThrow(MESSAGES.onlyResponsibleEdits);
});

test("US7: the responsible manager assigns and reassigns", async () => {
  expect(await assignTask(harry, GRYFFINDOR, "g1", "demo-hermione")).toMatchObject({ status: "assigned", assigneeName: "Hermione G." });
  expect(await assignTask(harry, GRYFFINDOR, "g1", harry.id)).toMatchObject({ assigneeId: harry.id });
});

test("US8: pick up an Available task; one with an assignee cannot be picked up (5a); give back (4a)", async () => {
  const picked = await pickUpTask(harry, PRIVET, "t2");
  expect(picked).toMatchObject({ status: "assigned", assigneeId: harry.id });

  await expect(pickUpTask(harry, PRIVET, "t1")).rejects.toThrow(MESSAGES.alreadyAssigned);

  const back = await giveBackTask(harry, PRIVET, "t2");
  expect(back).toMatchObject({ status: "available", assigneeId: null });
});

test("US9: only the assignee marks a task as done (5a), and only with an assignee (5b)", async () => {
  await expect(markTaskDone(harry, PRIVET, "t1")).rejects.toThrow(MESSAGES.onlyAssigneeDone);
  await expect(markTaskDone(harry, GRYFFINDOR, "g5")).rejects.toThrow(MESSAGES.assignFirst);

  const { credited, task } = await markTaskDone(harry, PRIVET, "t3");
  expect(credited).toBe(2);
  expect(task).toMatchObject({ status: "done", creditedCookies: 2, markedById: harry.id });
});

test("US9 7.1: no cookies when it is marked as done after the due date", async () => {
  const late = await markTaskDone(harry, PRIVET, "t3", new Date(Date.now() + 10 * DAY));
  expect(late.credited).toBe(0);
});

test("US6 7b / US7 6b: a DONE task cannot be edited, deleted or assigned; returning keeps the assignee (US9 4b)", async () => {
  await expect(assignTask(harry, GRYFFINDOR, "gc2", harry.id)).rejects.toThrow(MESSAGES.doneNoAssign);
  await expect(updateTask(harry, GRYFFINDOR, "gc2", { title: "X" })).rejects.toThrow(MESSAGES.doneNoEdit);
  await expect(deleteTask(harry, GRYFFINDOR, "gc2")).rejects.toThrow(MESSAGES.doneNoDelete);

  const returned = await returnTask(harry, GRYFFINDOR, "gc2");
  expect(returned).toMatchObject({ status: "assigned", assigneeId: harry.id, creditedCookies: 0 });
});

test("US9 4c: only the responsible manager returns a DONE task", async () => {
  await expect(returnTask(harry, GRYFFINDOR, "gc1")).rejects.toThrow(MESSAGES.onlyResponsibleReturns);
  const { tasks } = await listTasks(harry, GRYFFINDOR);
  expect(tasks.find((task) => task.id === "gc1").status).toBe("done");
});
