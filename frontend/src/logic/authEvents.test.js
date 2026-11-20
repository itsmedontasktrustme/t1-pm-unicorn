import React from "react";
import { act, render } from "@testing-library/react";
import { logSignOut, useSignInLogging } from "./authEvents";

const mockAuth = { isSignedIn: true, sessionId: "sess_1", getToken: () => Promise.resolve("token-1") };

jest.mock("@clerk/react", () => ({
  useAuth: () => mockAuth,
  useUser: () => ({ user: { id: "user_1", fullName: "Ada Lovelace" } })
}));

function Probe() {
  useSignInLogging();
  return null;
}

async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  delete window.Clerk;
});

test("logs the sign-in of a new session once, with the bearer token", async () => {
  const { rerender } = render(<Probe />);
  await settle();
  rerender(<Probe />);
  await settle();

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/auth/sign-in");
  expect(options.method).toBe("POST");
  expect(options.headers.Authorization).toBe("Bearer token-1");
  expect(JSON.parse(options.body)).toEqual({ user: { fullName: "Ada Lovelace" } });

  // A reload of the same session does not log it again.
  render(<Probe />);
  await settle();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("tries again when the backend did not accept the sign-in", async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
  render(<Probe />);
  await settle();
  render(<Probe />);
  await settle();

  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test("logs the sign-out with the current session token", async () => {
  window.Clerk = { session: { getToken: () => Promise.resolve("token-2") } };

  await expect(logSignOut({ fullName: "Ada Lovelace" })).resolves.toBe(true);

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/auth/sign-out");
  expect(options.headers.Authorization).toBe("Bearer token-2");
});

test("does not call the backend without a session", async () => {
  await expect(logSignOut(null)).resolves.toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
});
