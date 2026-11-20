const { handle } = require("../logic/errors");
const { requireResident } = require("../logic/residents");
const tasks = require("../logic/tasks");

/* HK-73 / HK-76 / HK-79 / HK-82 / HK-85: tasks of a household (US5–US9). */
function registerTaskEndpoints(app) {
  const base = "/api/households/:householdId/tasks";
  const meId = (req) => Number(req.resident.id);
  const ids = (req) => [req.params.householdId, req.params.taskId];

  app.get(
    base,
    requireResident,
    handle(async (req) => tasks.listTasks(req.params.householdId, meId(req)))
  );

  app.post(
    base,
    requireResident,
    handle(async (req) => ({ task: await tasks.createTask(req.params.householdId, meId(req), req.body) }))
  );

  app.patch(
    `${base}/:taskId`,
    requireResident,
    handle(async (req) => ({ task: await tasks.updateTask(...ids(req), meId(req), req.body) }))
  );

  app.delete(
    `${base}/:taskId`,
    requireResident,
    handle(async (req) => {
      await tasks.deleteTask(...ids(req), meId(req));
      return {};
    })
  );

  app.post(
    `${base}/:taskId/hand-over`,
    requireResident,
    handle(async (req) => ({ task: await tasks.handOverTask(...ids(req), meId(req), req.body?.managerId) }))
  );

  app.post(
    `${base}/:taskId/assign`,
    requireResident,
    handle(async (req) => ({ task: await tasks.assignTask(...ids(req), meId(req), req.body?.assigneeId) }))
  );

  app.post(
    `${base}/:taskId/pick-up`,
    requireResident,
    handle(async (req) => ({ task: await tasks.pickUpTask(...ids(req), meId(req)) }))
  );

  app.post(
    `${base}/:taskId/give-back`,
    requireResident,
    handle(async (req) => ({ task: await tasks.giveBackTask(...ids(req), meId(req)) }))
  );

  app.post(
    `${base}/:taskId/done`,
    requireResident,
    handle(async (req) => tasks.markTaskDone(...ids(req), meId(req)))
  );

  app.post(
    `${base}/:taskId/return`,
    requireResident,
    handle(async (req) => ({ task: await tasks.returnTask(...ids(req), meId(req)) }))
  );
}

module.exports = { registerTaskEndpoints };
