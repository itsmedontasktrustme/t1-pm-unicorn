import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ApiErrorState, { errorKind } from "./ApiErrorState";
import { ApiError } from "../../api/client";

function show(error, props = {}) {
  return render(
    <MemoryRouter>
      <ApiErrorState error={error} text="We couldn’t load the tasks. Check your connection and try again." onRetry={() => {}} {...props} />
    </MemoryRouter>
  );
}

test("HK-94: error answers map to the right state", () => {
  expect(errorKind(new ApiError("unauthorized", "x", 401))).toBe("session");
  expect(errorKind(new ApiError("not-owner", "x", 403))).toBe("forbidden");
  expect(errorKind(new ApiError("not-found", "x", 404))).toBe("not-found");
  expect(errorKind(new ApiError("not-found", "x"))).toBe("not-found");
  expect(errorKind(new ApiError("server", "x", 503))).toBe("server");
  expect(errorKind(new ApiError("network", "x"))).toBe("network");
});

test("HK-97: 403 shows the calm no-access state with the text from the backend", () => {
  show(new ApiError("not-owner", "Only the owner can invite residents to this household", 403));
  expect(screen.getByRole("heading", { name: "Only the owner can invite residents to this household" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
});

test("HK-94: 404 shows not found with a way out instead of Try again", () => {
  show(new ApiError("not-found", "Household not found.", 404), {
    notFoundTitle: "This household isn’t available",
    notFoundText: "You may no longer be a housemate there."
  });
  expect(screen.getByRole("heading", { name: "This household isn’t available" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go to Home" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
});

test("HK-94: server and network errors can be retried", () => {
  const { unmount } = show(new ApiError("server", "x", 500));
  expect(screen.getByText("Something went wrong on our side. Please try again in a moment.")).toBeInTheDocument();
  expect(screen.getByText(/Error 500/)).toBeInTheDocument();
  unmount();

  show(new ApiError("network", "We couldn’t reach Homekeeper."));
  expect(screen.getByText("We couldn’t load the tasks. Check your connection and try again.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
