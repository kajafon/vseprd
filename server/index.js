// server/index.js

const express = require("express");
const fs = require('fs')
const PORT = process.env.PORT || 8080;
const path = require("path");

const app = express()

app.get("/corpus/:what", (req, res) => {    
  console.log("params:" + JSON.stringify(req.params))
  let what = req.params.what.replace(/[^a-zA-Z0-9]+/, "")
  let file = "server/corpus_" + what + ".txt"
  console.log("what:" + what + " -> " + file)
  let inputText = fs.readFileSync(file, 'utf-8')
  res.json({ corpus: inputText, cvd: process.cwd()});
});

app.use(express.static(path.resolve(__dirname, '../client/build')));
  
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});