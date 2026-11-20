import {
  answerInvitee,
  changeRole,
  createHousehold,
  createInvitation,
  getInvitation,
  getInvitationState,
  joinWithCode,
  listPendingInvitations,
  getHousehold,
  getMemberProfile,
  listHouseholdHistory,
  listMyHistory,
  listMyHouseholds,
  listMyMemberships
} from "./households";
import { request } from "./client";

// The same functions with the backend switched on (no placeholder).
jest.mock("./client", () => {
  const actual = jest.requireActual("./client");
  return { ...actual, USE_PLACEHOLDER_API: false, request: jest.fn() };
});

const user = { id: "user_1", fullName: "Hermione Granger" };

beforeEach(() => request.mockReset());

test("HK-61 / HK-64 / HK-67: household functions call the backend", async () => {
  request.mockResolvedValueOnce({ households: [{ id: "1", name: "The Burrow" }] });
  await expect(listMyHouseholds(user)).resolves.toEqual([{ id: "1", name: "The Burrow" }]);
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/households");

  request.mockResolvedValueOnce({ household: { id: "2", name: "Shell Cottage" } });
  await createHousehold(user, "Shell Cottage", "By the sea");
  expect(request).toHaveBeenLastCalledWith(user, "POST", "/households", { name: "Shell Cottage", description: "By the sea" });

  request.mockResolvedValueOnce({ household: { id: "2", meId: "7", members: [], tasks: [] } });
  await expect(getHousehold(user, "2")).resolves.toMatchObject({ meId: "7" });
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/households/2");

  request.mockResolvedValueOnce({ memberships: [] });
  await listMyMemberships(user);
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/me/households");

  request.mockResolvedValueOnce({ profile: { meId: "7" } });
  await getMemberProfile(user, "2", "9");
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/households/2/members/9");
});

test("HK-52: a role change calls the backend and returns the updated household", async () => {
  request.mockResolvedValueOnce({ household: { id: "2", meId: "7", members: [] } });
  await expect(changeRole(user, "2", "9", "hand-over-owner")).resolves.toMatchObject({ id: "2" });
  expect(request).toHaveBeenLastCalledWith(user, "POST", "/households/2/members/9/role", { action: "hand-over-owner" });
});

test("HK-49 / HK-268: invitation functions call the backend", async () => {
  request.mockResolvedValue({ invitation: {}, pending: [], invitees: [] });

  await getInvitationState(user, "2");
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/households/2/invitation");

  await createInvitation(user, "2", "3");
  expect(request).toHaveBeenLastCalledWith(user, "POST", "/households/2/invitation", { validDays: 3 });

  await getInvitation(user, "hk7k2m5p");
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/invitations/HK-7K2M-5P");

  await joinWithCode(user, " hk-7k2m-5p ");
  expect(request).toHaveBeenLastCalledWith(user, "POST", "/invitations/join", { code: "HK-7K2M-5P" });

  await listPendingInvitations(user);
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/me/pending");

  await answerInvitee(user, "2", "9", "accept");
  expect(request).toHaveBeenLastCalledWith(user, "POST", "/households/2/invitees/9/accept");
});

test("HK-88 / HK-91: history functions call the backend", async () => {
  request.mockResolvedValue({ history: { meId: "7" } });

  await expect(listHouseholdHistory(user, "2")).resolves.toEqual({ meId: "7" });
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/households/2/history");

  await listMyHistory(user);
  expect(request).toHaveBeenLastCalledWith(user, "GET", "/me/history");
});
