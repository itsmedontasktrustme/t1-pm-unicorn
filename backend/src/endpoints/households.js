const { handle } = require("../logic/errors");
const { requireResident } = require("../logic/residents");
const households = require("../logic/households");
const roles = require("../logic/roles");

function registerHouseholdEndpoints(app) {
  const meId = (req) => Number(req.resident.id);

  // HK-61 / HK-64: households of the signed-in resident (header switcher, start screen).
  app.get(
    "/api/households",
    requireResident,
    handle(async (req) => ({ households: await households.listMyHouseholds(meId(req)) }))
  );

  // HK-64 (US1): create a household; the creator becomes owner and manager.
  app.post(
    "/api/households",
    requireResident,
    handle(async (req) => ({ household: await households.createHousehold(meId(req), req.body) }))
  );

  // HK-61: household view with members, roles, cookies and tasks.
  app.get(
    "/api/households/:householdId",
    requireResident,
    handle(async (req) => ({ household: await households.getHousehold(req.params.householdId, meId(req)) }))
  );

  // HK-67: the resident's profile — roles and cookies in each household.
  app.get(
    "/api/me/households",
    requireResident,
    handle(async (req) => ({ memberships: await households.listMyMemberships(meId(req)) }))
  );

  // Housemate profile.
  app.get(
    "/api/households/:householdId/members/:memberId",
    requireResident,
    handle(async (req) => ({
      profile: await households.getMemberProfile(req.params.householdId, req.params.memberId, meId(req))
    }))
  );

  // HK-52 (US4): owner grants / removes the manager role or hands over the owner role.
  // Answers with the updated household so the People screen can show the new roles at once.
  app.post(
    "/api/households/:householdId/members/:memberId/role",
    requireResident,
    handle(async (req) => {
      await roles.changeRole(req.params.householdId, req.params.memberId, req.body?.action, meId(req));
      return { household: await households.getHousehold(req.params.householdId, meId(req)) };
    })
  );
}

module.exports = { registerHouseholdEndpoints };
