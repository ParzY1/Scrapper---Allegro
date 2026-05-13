import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname)));

// API endpoint do pobierania wyników (JSON)
app.get("/api/results", (req, res) => {
  try {
    const filePath = path.join(__dirname, "wyniki.json");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Brak pliku wyniki.json" });
    }
    const data = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Błąd odczytu pliku" });
  }
});

// SSR - renderuj dashboard po stronie serwera
app.get("/", (req, res) => {
  try {
    const filePath = path.join(__dirname, "wyniki.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      return res.render("dashboard", { data });
    }
    res.render("dashboard", { data: null });
  } catch (error) {
    res.render("dashboard", { data: null });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Serwer uruchomiony: http://localhost:${PORT}`);
});
