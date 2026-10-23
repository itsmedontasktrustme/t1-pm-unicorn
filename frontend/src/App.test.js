import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

test("renders the homekeeper header and overview page", () => {
  const { getByText, getAllByText } = render(<App />);
  expect(getByText(/welcome to Homekeeper/i)).toBeInTheDocument();
  expect(getAllByText(/Overview/i).length).toBeGreaterThan(0);
  expect(getByText(/This is a placeholder for the home overview page\./i)).toBeInTheDocument();
});
