const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

const DATA_PATH = path.join(__dirname, "data", "contribution.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readData() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

app.get("/api/contribution", (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read contribution data" });
  }
});

// POST to update current contribution settings
app.post("/api/contribution", (req, res) => {
  const { type, value } = req.body;

  if (!["percent", "dollar"].includes(type)) {
    return res.status(400).json({ error: "Invalid type" });
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue) || numericValue < 0) {
    return res.status(400).json({ error: "Invalid value" });
  }

  try {
    const data = readData();

    const nowIso = new Date().toISOString();

    // Save type, value, and timestamp of last save
    data.current = {
      type,
      value: numericValue,
      savedAt: nowIso,
    };

    writeData(data);

    res.json({
      success: true,
      current: data.current,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save contribution data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
