const path = require("path");

function getLogPath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "log.txt");
  } else {
    return path.join(process.cwd(), "views", "log.txt");
  }
}

module.exports = { getLogPath };
