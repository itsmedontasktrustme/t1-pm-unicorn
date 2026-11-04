import { trackAction } from "./HistoryTracker";

test("HK-265: only the user's id and name are sent to the activity log", () => {
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

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body).toEqual({
    component: "PeoplePage",
    action: "load",
    user: { id: "user_123", fullName: "Harry Potter" }
  });
});
