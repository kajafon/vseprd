// server/index.js

const express = require("express");
const fs = require('fs')
const PORT = process.env.PORT || 8080;
const path = require("path");

const app = express()

console.log("---- kokot")

app.get("/corpus", (req, res) => {    
  let inputText = fs.readFileSync("server/corpus.txt", 'utf-8')
  res.json({ corpus: inputText, cvd: process.cwd()});
});

app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
  
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});