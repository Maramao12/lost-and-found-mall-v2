/* =====================================================================
   src/models/Categorie.js  ->  collection "categories"
   (le nom est unique grâce à l'index du script)
   ===================================================================== */

const mongoose = require("mongoose");

const categorieSchema = new mongoose.Schema(
  {
    nom:         { type: String, required: true, trim: true },
    description: { type: String, trim: true }
  },
  { collection: "categories", versionKey: false }
);

module.exports = mongoose.model("Categorie", categorieSchema);
