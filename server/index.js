// server/index.js

const express = require("express");
const fs = require('fs')
const PORT = process.env.PORT || 3001;

const app = express();

app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
  });

app.get("/corpus", (req, res) => {
    
    let inputText = fs.readFileSync("server/corpus.txt", 'utf-8')
    res.json({ corpus: inputText, cvd: process.cwd()});
  });
 
  
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});