const { createProxyMiddleware } = require("http-proxy-middleware");

const backendTarget = process.env.REACT_APP_BACKEND_URL || "http://backend:81";
const oidcTarget = process.env.REACT_APP_OIDC_URL || "http://oidc-mock:8080";

module.exports = function(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true
    })
  );
  app.use(
    "/oidc",
    createProxyMiddleware({
      target: oidcTarget,
      changeOrigin: true,
      pathRewrite: { "^/oidc": "" }
    })
  );
};
