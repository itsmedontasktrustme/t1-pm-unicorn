import { trackAction } from "./HistoryTracker";

// The tracker asks Clerk for a session token before it sends (8013fee).
jest.mock("./auth", () => ({ getClerkToken: () => Promise.resolve("token-123") }));

// Let the token promise resolve and fetch() be called.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("HK-265: only the user's id and name are sent to the activity log, with the Clerk token", async () => {
  const fetchMock = jest.fn(() => Promise.resolve({ ok: true }));
  global.fetch = fetchMock;

  trackAction(
    "PeoplePage",
    {
      id: "user_123",
      fullName: "Harry Potter",
      primaryEmailAddress: { emailAddress: "harry.potter@gmail.com" },
      phoneNumbers: [{ phoneNumber: "+420 123 456 789" }]
    },
    "load"
  );
  await flush();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [, options] = fetchMock.mock.calls[0];
  expect(options.headers.Authorization).toBe("Bearer token-123");
  expect(JSON.parse(options.body)).toEqual({
    component: "PeoplePage",
    action: "load",
    user: { id: "user_123", fullName: "Harry Potter" }
  });
});
