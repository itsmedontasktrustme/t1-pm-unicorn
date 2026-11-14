import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import TasksPage from "./TasksPage";
import TaskIndex from "./TaskIndex";
import TaskDetail from "./TaskDetail";
import TaskForm from "./TaskForm";
import { CurrentHouseholdProvider } from "../../logic/CurrentHousehold";
import { resetPlaceholderData } from "../../api/households";

jest.mock("@clerk/react", () => ({
  useUser: () => ({ isLoaded: false, isSignedIn: false, user: null })
}));

jest.mock("../../logic/HistoryTracker", () => ({ trackAction: () => {} }));

async function settle(rounds = 5) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  }
}

async function renderTasks(householdId, path = "/tasks") {
  window.localStorage.setItem("homekeeper.currentHouseholdId", householdId);
  render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentHouseholdProvider>
        <Routes>
          <Route path="/tasks" element={<TasksPage />}>
            <Route index element={<TaskIndex />} />
            <Route path="new" element={<TaskForm mode="create" />} />
            <Route path=":taskId" element={<TaskDetail />} />
            <Route path=":taskId/edit" element={<TaskForm mode="edit" />} />
          </Route>
        </Routes>
      </CurrentHouseholdProvider>
    </MemoryRouter>
  );
  await settle();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPlaceholderData();
});

test("HK-72: a housemate sees open tasks with filters and no Create task", async () => {
  await renderTasks("hh-private-drive");

  expect(screen.getByRole("button", { name: "Open 4" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("link", { name: "Clean the toy room" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "+ Create task" })).not.toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: "Done 5" }));
  await settle(1);
  expect(screen.getByRole("link", { name: "Mow the lawn" })).toBeInTheDocument();
});

test("HK-72: overdue tasks are marked and a manager can create tasks", async () => {
  await renderTasks("hh-gryffindor");

  expect(screen.getByRole("link", { name: "+ Create task" })).toBeInTheDocument();
  expect(screen.getByText("Overdue · was due yesterday")).toBeInTheDocument();
});

test("HK-84 / US8: a housemate picks up an Available task", async () => {
  await renderTasks("hh-private-drive", "/tasks/t2");

  userEvent.click(screen.getByRole("button", { name: "Pick up task" }));
  await settle();

  expect(screen.getByText("You picked up “Clean the toy room”")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Give back" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Edit task" })).not.toBeInTheDocument();
});

test("HK-84 / US9: marking my task done credits the cookies", async () => {
  await renderTasks("hh-private-drive", "/tasks/t3");

  // The card in the list has the same quick action; use the one in the task panel.
  userEvent.click(screen.getAllByRole("button", { name: "Mark as done" }).pop());
  await settle();

  expect(screen.getByText(/\+2 cookies for you/)).toBeInTheDocument();
});

test("HK-75 / US5 7a: the form shows the errors from the test cases", async () => {
  await renderTasks("hh-gryffindor", "/tasks/new");

  userEvent.click(screen.getByRole("button", { name: "Create task" }));
  await settle(1);

  expect(screen.getByText("Please fix 1 field")).toBeInTheDocument();
  expect(screen.getByText("Enter a task name.")).toBeInTheDocument();
});

test("HK-75 / US5: a manager creates an Available task", async () => {
  await renderTasks("hh-gryffindor", "/tasks/new");

  userEvent.type(screen.getByLabelText(/Task name/), "Polish the trophies");
  userEvent.click(screen.getByRole("button", { name: "Create task" }));
  await settle();

  expect(screen.getByRole("heading", { name: "Polish the trophies" })).toBeInTheDocument();
  expect(screen.getByText("Nobody yet")).toBeInTheDocument();
});

test("HK-81: a Done task offers Return task instead of Edit / Delete", async () => {
  await renderTasks("hh-gryffindor", "/tasks/gc1");

  expect(screen.getByText(/A task with the status Done cannot be edited/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Return task" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Edit task" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
});
