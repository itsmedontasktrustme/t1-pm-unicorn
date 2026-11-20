import { ApiError, ensureMe, request, resetClient } from "./client";

jest.mock("../logic/auth", () => ({ getClerkToken: () => Promise.resolve("token-123") }));

const user = {
  id: "user_1",
  fullName: "Hermione Granger",
  primaryEmailAddress: { emailAddress: "hermione@example.com" }
};

function answer(status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  resetClient();
});

test("HK-55/HK-58: the resident is created once before the first request, with the Clerk token", async () => {
  global.fetch = jest.fn((url) =>
    url === "/api/me"
      ? answer(200, { ok: true, resident: { id: "7", name: "Hermione Granger" } })
      : answer(200, { ok: true, households: [] })
  );

  await request(user, "GET", "/households");
  await request(user, "GET", "/households");

  const calls = global.fetch.mock.calls.map(([url, options]) => `${options.method} ${url}`);
  expect(calls).toEqual(["POST /api/me", "GET /api/households", "GET /api/households"]);

  const [, meOptions] = global.fetch.mock.calls[0];
  expect(meOptions.headers.Authorization).toBe("Bearer token-123");
  expect(JSON.parse(meOptions.body)).toEqual({ name: "Hermione Granger", email: "hermione@example.com" });
});

test("an error answer becomes ApiError with the text from the backend", async () => {
  global.fetch = jest.fn((url) =>
    url === "/api/me"
      ? answer(200, { ok: true, resident: { id: "7" } })
      : answer(403, { ok: false, code: "forbidden", error: "Only the responsible manager can edit this task" })
  );

  const error = await request(user, "PATCH", "/tasks/1", { name: "x" }).catch((caught) => caught);

  expect(error).toBeInstanceOf(ApiError);
  expect(error.code).toBe("forbidden");
  expect(error.status).toBe(403);
  expect(error.message).toBe("Only the responsible manager can edit this task");
});

test("a failed POST /api/me is retried on the next request", async () => {
  global.fetch = jest.fn(() => Promise.reject(new TypeError("offline")));
  const first = await ensureMe(user).catch((caught) => caught);
  expect(first.code).toBe("network");

  global.fetch = jest.fn(() => answer(200, { ok: true, resident: { id: "7" } }));
  await expect(ensureMe(user)).resolves.toEqual({ id: "7" });
});
