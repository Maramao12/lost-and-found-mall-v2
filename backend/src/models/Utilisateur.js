/* =====================================================================
   src/models/Utilisateur.js  ->  collection "utilisateurs"
   ---------------------------------------------------------------------
   Classe abstraite Utilisateur + Membre + Administrateur : UNE seule
   collection, le champ "role" les distingue (MEMBRE ou ADMIN).
   Les méthodes du diagramme (sAuthentifier, consulterProfil...) sont
   écrites dans les contrôleurs, pas dans le modèle.
   ===================================================================== */

const mongoose = require("mongoose");
const { ROLES } = require("../constants/enums");

const utilisateurSchema = new mongoose.Schema(
  {
    nom:    { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },

    // L'unicité de l'email est garantie par l'index unique du script.
    // lowercase évite "A@mail.tn" et "a@mail.tn" comme deux comptes.
    email:  { type: String, required: true, trim: true, lowercase: true },

    // select:false -> le hash n'est JAMAIS renvoyé par défaut.
    // Pour l'avoir (connexion) : Utilisateur.findOne(...).select("+motDePasseHash")
    motDePasseHash: { type: String, required: true, select: false },

    telephone:    { type: String, trim: true },
    actif:        { type: Boolean, default: true },
    dateCreation: { type: Date, default: Date.now },
    role:         { type: String, enum: ROLES, default: "MEMBRE" }
  },
  {
    collection: "utilisateurs",   // même nom que dans le script
    versionKey: false             // pas de champ __v
  }
);

module.exports = mongoose.model("Utilisateur", utilisateurSchema);
