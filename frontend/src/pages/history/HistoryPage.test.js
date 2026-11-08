import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import HistoryPage from "./HistoryPage";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { createHousehold, resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

async function settle(rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

async function renderHistory(householdId) {
  window.localStorage.setItem("homekeeper.currentHouseholdId", householdId);
  render(
    <MemoryRouter>
      <CurrentHouseholdProvider>
        <HistoryPage />
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("US10: household view shows completed tasks with who marked them done and cookie totals", async () => {
  await renderHistory("hh-private-drive");

  expect(screen.getByText("Cookies by housemate")).toBeInTheDocument();
  expect(screen.getByText("Clean the kitchen")).toBeInTheDocument();
  expect(screen.getByText(/Petunia D\. · marked done by Vernon D\./)).toBeInTheDocument();
  expect(screen.getByText(/Harry Potter · marked done by you/)).toBeInTheDocument();
  expect(screen.getByLabelText("120 cookies")).toBeInTheDocument();
});

test("US10 3a: a household without completed tasks says so", async () => {
  const household = await createHousehold({ id: "dev-demo-resident", fullName: "Harry Potter" }, "Flat Vinohrady");
  await renderHistory(household.id);

  expect(screen.getByText("There are no completed tasks in this household yet")).toBeInTheDocument();
});

test("US10 2a-2b: Mine shows own cookies across households and own completed tasks", async () => {
  await renderHistory("hh-private-drive");

  userEvent.click(screen.getByRole("button", { name: "Mine" }));
  await settle();

  expect(screen.getByText("104")).toBeInTheDocument();
  expect(screen.getByText("64 · Private Drive No. 4")).toBeInTheDocument();
  expect(screen.getByText("40 · Gryffindor Tower")).toBeInTheDocument();
  expect(screen.getByText("Mow the lawn")).toBeInTheDocument();
  expect(screen.getByText("Sweep the common room")).toBeInTheDocument();
  expect(screen.getByText("marked done by Ron W.")).toBeInTheDocument();
});

test("US10 2c: Audit loads the user's activity log with pagination", async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        page: 1,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
        data: [{ id: 1, component: "HomePage", action: "view", userId: "dev-demo-resident", createdAt: "2024-01-01T00:00:00.000Z" }]
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        page: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
        data: [{ id: 2, component: "TaskBoard", action: "complete", userId: "dev-demo-resident", createdAt: "2024-01-02T00:00:00.000Z" }]
      })
    });

  global.fetch = fetchMock;
  await renderHistory("hh-private-drive");

  await userEvent.click(screen.getByRole("button", { name: "Audit" }));
  await settle();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toContain("/api/history/action/dev-demo-resident?page=1&limit=20");
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "2" }));
  await settle();

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toContain("page=2");
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
});
