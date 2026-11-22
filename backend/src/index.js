const app = require("./server");
const { port } = require("./config");
const { isAuthConfigured } = require("./logic/auth");

const server = app.listen(port, function() {
  console.log("Webserver is ready");
});

// Log auth configuration on startup
if (!isAuthConfigured()) {
  console.warn("[Auth] ⚠️  CLERK_SECRET_KEY or CLERK_JWT_KEY is not set: every protected /api endpoint will answer 401.");
} else {
  const { auth: authConfig } = require("./config");
  console.log("[Auth] ✅ Authentication is configured:", {
    hasSecretKey: Boolean(authConfig.secretKey),
    hasJwtKey: Boolean(authConfig.jwtKey),
    jwtKeyLength: authConfig.jwtKey ? authConfig.jwtKey.length : 0,
    jwtKeyFirstLine: authConfig.jwtKey ? authConfig.jwtKey.split('\n')[0] : "N/A"
  });
}

//
// need this in docker container to properly exit since node doesn't handle SIGINT/SIGTERM
// this also won't work on using npm start since:
// https://github.com/npm/npm/issues/4603
// https://github.com/npm/npm/pull/10868
// https://github.com/RisingStack/kubernetes-graceful-shutdown-example/blob/master/src/index.js
// if you want to use npm then start with `docker run --init` to help, but I still don't think it's
// a graceful shutdown of node process
//

// quit on ctrl-c when running docker in terminal
process.on("SIGINT", function onSigint() {
  console.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// quit properly on docker stop
process.on("SIGTERM", function onSigterm() {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// shut down server
function shutdown() {
  server.close(function onServerClosed(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
}
//
// need above in docker container to properly exit
//
