const { handle } = require("../logic/errors");
const { requireResident } = require("../logic/residents");
const households = require("../logic/households");

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
}

module.exports = { registerHouseholdEndpoints };
