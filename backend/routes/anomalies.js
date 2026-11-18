const express = require("express");
const router = express.Router();
const { analyze } = require("../services/anomalyService");
const { fakeEvents } = require("../fakeData");

// À REMPLACER plus tard par votre vraie base de données
async function getEvents() {
  return fakeEvents();
}

router.get("/anomalies", async (req, res) => {
  try {
    const events = await getEvents();
    const threshold = Number(req.query.threshold) || 0.6;
    res.json(analyze(events, threshold));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur d'analyse des anomalies" });
  }
});

module.exports = router;
