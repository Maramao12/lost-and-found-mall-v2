/* =====================================================================
   src/models/Zone.js  ->  collection "zones"
   (le nom est unique grâce à l'index du script)
   ===================================================================== */

const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    nom:         { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    emplacement: { type: String, trim: true }     // ex : "Niveau 2"
  },
  { collection: "zones", versionKey: false }
);

module.exports = mongoose.model("Zone", zoneSchema);
