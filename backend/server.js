const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const SheetSchema = new mongoose.Schema({
  data: [[String]],
});
const Sheet = mongoose.model("Sheet", SheetSchema);

app.post("/save", async (req, res) => {
  const { data } = req.body;
  await Sheet.create({ data });
  res.json({ message: "Saved successfully!" });
});

app.get("/load", async (req, res) => {
  const sheet = await Sheet.findOne();
  res.json(sheet);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
