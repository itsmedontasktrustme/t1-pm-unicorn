module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: ["support/**/*.js", "steps/**/*.js"],
    format: ["progress-bar", "summary"],
    publishQuiet: true
  }
};
