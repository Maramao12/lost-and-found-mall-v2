/* =====================================================================
   src/models/Declaration.js -> collection "declarations"
   Relations : auteurId (Membre crée), categorieId (appartient à),
               zoneId (concerne)
   dateEvenement : date à laquelle l'objet a été PERDU ou TROUVÉ
                   (différente de dateCreation = date de la déclaration)
   ===================================================================== */

const mongoose = require("mongoose");
const { TYPE_DECLARATION, STATUT_DECLARATION } = require("../constants/enums");

const declarationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TYPE_DECLARATION,
      required: true,
    },

    titre: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    dateEvenement: {
      type: Date,
      required: true,
    },

    dateCreation: {
      type: Date,
      default: Date.now,
    },

    photoUrl: {
      type: String,
      trim: true,
    },

    statut: {
      type: String,
      enum: STATUT_DECLARATION,
      default: "PUBLIEE",
    },

    dateModification: {
      type: Date,
      default: Date.now,
    },

    // =========================================================
    // MODERATION ADMINISTRATIVE
    // =========================================================
    moderation: {
      estMasquee: {
        type: Boolean,
        default: false,
      },

      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Utilisateur",
        default: null,
      },

      motif: {
        type: String,
        trim: true,
        default: null,
      },

      dateAction: {
        type: Date,
        default: null,
      },
    },

    // =========================================================
    // RELATIONS AVEC LES AUTRES COLLECTIONS
    // =========================================================

    // Référence vers le membre qui crée la déclaration
    auteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },

    categorieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categorie",
      required: true,
    },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },
  },
  {
    collection: "declarations",
    versionKey: false,
  },
);

// =========================================================
// DÉCLENCHEMENT AUTOMATIQUE DU MATCHING IA
// =========================================================

declarationSchema.post("save", function (doc) {
  if (doc.statut === "PUBLIEE") {
    const {
      executerMatchingPourDeclaration,
    } = require("../controllers/matching.controller");

    executerMatchingPourDeclaration(doc._id).catch((err) => {
      console.error("[IA Matching Auto] Erreur en arrière-plan :", err.message);
    });
  }
});

module.exports = mongoose.model("Declaration", declarationSchema);
