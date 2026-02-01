const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = "./data.json";

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { records: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get("/", (req, res) => {
  res.send("Sirius server OK");
});

app.get("/records", (req, res) => {
  const data = readData();
  res.json(data.records);
});

app.post("/records", (req, res) => {
  const data = readData();
  data.records.push(req.body);
  writeData(data);
  res.json({ status: "ok" });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});