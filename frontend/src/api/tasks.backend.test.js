import {
  assignTask,
  createTask,
  deleteTask,
  giveBackTask,
  handOverTask,
  listTasks,
  markTaskDone,
  pickUpTask,
  returnTask,
  updateTask
} from "./tasks";
import { request } from "./client";

// The same functions with the backend switched on (no placeholder).
jest.mock("./client", () => {
  const actual = jest.requireActual("./client");
  return { ...actual, USE_PLACEHOLDER_API: false, request: jest.fn() };
});

const user = { id: "user_1" };
const base = "/households/2/tasks";

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ task: { id: "5" }, tasks: [], credited: 3 });
});

test("HK-73…HK-85: task functions call the backend", async () => {
  await listTasks(user, "2");
  expect(request).toHaveBeenLastCalledWith(user, "GET", base);

  await createTask(user, "2", { title: " Mop ", cookies: "3", assigneeId: "9" });
  expect(request).toHaveBeenLastCalledWith(user, "POST", base, {
    title: "Mop",
    description: "",
    due: null,
    cookies: 3,
    assigneeId: "9"
  });

  await updateTask(user, "2", "5", { title: "Mop", description: "", due: null, cookies: "4" });
  expect(request).toHaveBeenLastCalledWith(user, "PATCH", `${base}/5`, { title: "Mop", description: "", due: null, cookies: "4" });

  await deleteTask(user, "2", "5");
  expect(request).toHaveBeenLastCalledWith(user, "DELETE", `${base}/5`);

  const calls = [
    [() => handOverTask(user, "2", "5", "7"), "hand-over", { managerId: "7" }],
    [() => assignTask(user, "2", "5", "9"), "assign", { assigneeId: "9" }],
    [() => pickUpTask(user, "2", "5"), "pick-up"],
    [() => giveBackTask(user, "2", "5"), "give-back"],
    [() => returnTask(user, "2", "5"), "return"]
  ];
  for (const [call, action, body] of calls) {
    // eslint-disable-next-line no-await-in-loop
    await call();
    const expected = [user, "POST", `${base}/5/${action}`];
    if (body) {
      expected.push(body);
    }
    expect(request).toHaveBeenLastCalledWith(...expected);
  }

  await expect(markTaskDone(user, "2", "5")).resolves.toMatchObject({ credited: 3 });
  expect(request).toHaveBeenLastCalledWith(user, "POST", `${base}/5/done`);
});

test("US5 7a: an invalid form is not sent", async () => {
  await expect(createTask(user, "2", { title: "", cookies: "101" })).rejects.toMatchObject({
    code: "invalid",
    fields: { title: "Please enter a task name (max 100 characters)", cookies: "The number of cookies must be a whole number from 1 to 100" }
  });
  expect(request).not.toHaveBeenCalled();
});
