const { createProxyMiddleware } = require("http-proxy-middleware");

const backendTarget = process.env.REACT_APP_BACKEND_URL || "http://backend:81";

module.exports = function(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true
    })
  );
};
