import { resetPlaceholderData } from "./households";
import {
  assignTask,
  createTask,
  deleteTask,
  giveBackTask,
  listTasks,
  markTaskDone,
  MESSAGES,
  pickUpTask,
  returnTask,
  updateTask,
  validateTask
} from "./tasks";

const harry = { id: "dev-demo-resident", fullName: "Harry Potter" };
const GRYFFINDOR = "hh-gryffindor"; // Harry is owner + manager
const PRIVET = "hh-private-drive"; // Harry is a housemate

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("US5 7a / HK-202: name required, past due date and negative cookies are rejected", () => {
  const now = new Date("2026-11-14T12:00:00");
  const { fields } = validateTask({ title: "  ", due: "2026-11-13T18:00:00", cookies: "-1" }, { now });
  expect(fields).toEqual({
    title: "Enter a task name.",
    due: "Due date can’t be in the past.",
    cookies: "Enter a whole number, 0 or more."
  });
});

test("US5: without an assignee the task is Available, with one it is Assigned", async () => {
  const free = await createTask(harry, GRYFFINDOR, { title: "Polish the trophies" });
  expect(free.status).toBe("available");

  const assigned = await createTask(harry, GRYFFINDOR, { title: "Fix the stairs", assigneeId: "demo-ron" });
  expect(assigned).toMatchObject({ status: "assigned", assigneeName: "Ron W." });
});

test("US5 7b: the assignee must be a housemate of the household", async () => {
  await expect(createTask(harry, GRYFFINDOR, { title: "X", assigneeId: "demo-vernon" })).rejects.toThrow(MESSAGES.notHousemate);
});

test("BR-TASK-03: a housemate cannot create, edit or delete tasks", async () => {
  await expect(createTask(harry, PRIVET, { title: "X" })).rejects.toMatchObject({ code: "not-manager" });
  await expect(updateTask(harry, PRIVET, "t2", { title: "X" })).rejects.toMatchObject({ code: "not-manager" });
  await expect(deleteTask(harry, PRIVET, "t2")).rejects.toMatchObject({ code: "not-manager" });
});

test("US8: pick up an Available task; an Assigned one cannot be picked up (5a); give back (4a)", async () => {
  const picked = await pickUpTask(harry, PRIVET, "t2");
  expect(picked).toMatchObject({ status: "assigned", assigneeId: harry.id });

  await expect(pickUpTask(harry, PRIVET, "t1")).rejects.toThrow(MESSAGES.onlyAvailable);

  const back = await giveBackTask(harry, PRIVET, "t2");
  expect(back).toMatchObject({ status: "available", assigneeId: null });
});

test("US9: only the assignee or a manager marks done; cookies go to the assignee on time", async () => {
  await expect(markTaskDone(harry, PRIVET, "t1")).rejects.toThrow(MESSAGES.onlyAssigneeOrManager);

  const { credited } = await markTaskDone(harry, PRIVET, "t3");
  expect(credited).toBe(2);
  const { members } = await listTasks(harry, PRIVET);
  expect(members.find((member) => member.id === harry.id)).toBeTruthy();
});

test("BR-CK-02 / BR-CK-03: no cookies after the due date or without an assignee", async () => {
  const late = await markTaskDone(harry, GRYFFINDOR, "g4");
  expect(late.credited).toBe(0);

  const nobody = await markTaskDone(harry, GRYFFINDOR, "g5");
  expect(nobody.credited).toBe(0);
});

test("US7: Done tasks cannot be assigned, edited or deleted; a manager can return them (US9 4a)", async () => {
  await markTaskDone(harry, GRYFFINDOR, "g2");
  await expect(assignTask(harry, GRYFFINDOR, "g2", harry.id)).rejects.toThrow(MESSAGES.doneNoAssign);
  await expect(updateTask(harry, GRYFFINDOR, "g2", { title: "X" })).rejects.toThrow(MESSAGES.doneNoEdit);
  await expect(deleteTask(harry, GRYFFINDOR, "g2")).rejects.toThrow(MESSAGES.doneNoDelete);

  const returned = await returnTask(harry, GRYFFINDOR, "g2");
  expect(returned.status).toBe("assigned");
});

test("BR-TASK-26: only a manager can return a Done task", async () => {
  await markTaskDone(harry, PRIVET, "t3");
  await expect(returnTask(harry, PRIVET, "t3")).rejects.toThrow(MESSAGES.onlyManagerReturns);
});
