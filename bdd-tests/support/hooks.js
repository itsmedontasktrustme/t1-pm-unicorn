const { Before, After, setDefaultTimeout } = require("@cucumber/cucumber");

setDefaultTimeout(15_000);

Before(async function () {
  await this.init();
});

After(async function () {
  await this.cleanup();
});
