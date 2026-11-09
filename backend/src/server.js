// simple node web server that displays hello world
// optimized for Docker image

const express = require("express");
// this example uses express web framework so we know what longer build times
// do and how Dockerfile layer ordering matters. If you mess up Dockerfile ordering
// you'll see long build times on every code change + build. If done correctly,
// code changes should be only a few seconds to build locally due to build cache.

const morgan = require("morgan");
// morgan provides easy logging for express, and by default it logs to stdout
// which is a best practice in Docker. Friends don't let friends code their apps to
// do app logging to files in containers.

const database = require("./database");
const { registerHistoryActionEndpoint } = require("./endpoints/history");
const { registerAuthEndpoints } = require("./endpoints/auth");
const { isAuthConfigured } = require("./logic/auth");

function logServerError(context, error, extra = {}) {
  const details = {
    context,
    message: error?.message || String(error),
    stack: error?.stack,
    ...extra
  };

  console.error("[Backend error]", JSON.stringify(details, null, 2));
}

// Appi
const app = express();

// The backend runs behind nginx / the dev proxy (Docker networks), so req.ip is taken
// from X-Forwarded-For set by those private-network proxies only.
app.set("trust proxy", "loopback, linklocal, uniquelocal");

if (!isAuthConfigured() && process.env.NODE_ENV !== "test") {
  console.warn("[Auth] CLERK_SECRET_KEY or CLERK_JWT_KEY is not set: every protected /api endpoint will answer 401.");
}

app.use(express.json());
app.use(morgan("common"));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.get("/", function(req, res, next) {
  database.raw('select VERSION() version')
    .then(([rows]) => rows[0])
    .then((row) => res.json({ message: `Hello from MySQL ${row.version}` }))
    .catch(next);
});

app.get("/healthz", function(req, res) {
  // do app logic here to determine if app is truly healthy
  // you should return 200 if healthy, and anything else will fail
  // if you want, you should be able to restrict this to localhost (include ipv4 and ipv6)
  res.send("I am happy and healthy\n");
});

registerAuthEndpoints(app);
registerHistoryActionEndpoint(app);

app.use(function(req, res) {
  logServerError("Route not found", new Error(`Unhandled route: ${req.method} ${req.originalUrl}`), {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });

  return res.status(404).json({
    ok: false,
    error: "Not found",
    path: req.originalUrl
  });
});

app.use(function(err, req, res, _next) {
  logServerError("Express middleware", err, {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });

  const status = err.status || 500;

  return res.status(status).json({
    ok: false,
    error: "Internal server error",
    details: err.message || "Unknown error"
  });
});

process.on("uncaughtException", (error) => {
  logServerError("uncaughtException", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logServerError("unhandledRejection", reason instanceof Error ? reason : new Error(String(reason)));
});

module.exports = app;
