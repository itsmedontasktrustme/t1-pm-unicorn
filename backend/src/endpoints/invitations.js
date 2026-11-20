const { handle } = require("../logic/errors");
const { requireResident } = require("../logic/residents");
const invitations = require("../logic/invitations");

/* HK-49 / HK-268: invitation codes, joining as an Invitee, accept / reject (US2, US3). */
function registerInvitationEndpoints(app) {
  const meId = (req) => Number(req.resident.id);

  // Owner: current code + residents waiting for an answer.
  app.get(
    "/api/households/:householdId/invitation",
    requireResident,
    handle(async (req) => invitations.getInvitationState(req.params.householdId, meId(req)))
  );

  // Owner: new code valid for validDays (1–14, default 7); replaces the previous one.
  app.post(
    "/api/households/:householdId/invitation",
    requireResident,
    handle(async (req) => ({
      invitation: await invitations.createInvitation(req.params.householdId, meId(req), req.body?.validDays)
    }))
  );

  // Owner: accept or reject a resident who used the code.
  app.post(
    "/api/households/:householdId/invitees/:inviteeId/:answer(accept|reject)",
    requireResident,
    handle(async (req) =>
      invitations.answerInvitee(req.params.householdId, req.params.inviteeId, req.params.answer, meId(req))
    )
  );

  // Resident: what the code is for (before joining).
  app.get(
    "/api/invitations/:code",
    requireResident,
    handle(async (req) => ({ invitation: await invitations.previewInvitation(req.params.code) }))
  );

  // Resident: join with the code → Invitee.
  app.post(
    "/api/invitations/join",
    requireResident,
    handle(async (req) => ({ pending: await invitations.joinWithCode(req.body?.code, meId(req)) }))
  );

  // Resident: households where they wait for the owner ("Pending invitation").
  app.get(
    "/api/me/pending",
    requireResident,
    handle(async (req) => ({ pending: await invitations.listPending(meId(req)) }))
  );
}

module.exports = { registerInvitationEndpoints };
