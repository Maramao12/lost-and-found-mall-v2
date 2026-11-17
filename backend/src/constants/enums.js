/* =====================================================================
   src/constants/enums.js
   ---------------------------------------------------------------------
   Les ÉNUMÉRATIONS du diagramme de classes, écrites UNE SEULE FOIS.
   Elles sont utilisées :
     - dans les modèles Mongoose  (enum: TYPE_DECLARATION)
     - dans les schémas Zod       (z.enum(TYPE_DECLARATION))
   Si une valeur change, on la modifie ici et partout c'est à jour.
   ATTENTION : elles doivent rester identiques à celles du script
   database/lostfound_mongo.js (sinon MongoDB refusera les documents).
   ===================================================================== */

// Rôle de l'utilisateur (représente l'héritage Membre / Administrateur)
const ROLES = ["MEMBRE", "ADMIN"];

// TypeDeclaration
const TYPE_DECLARATION = ["PERDU", "TROUVE"];

// StatutDeclaration
const STATUT_DECLARATION = ["PUBLIEE", "EN_COURS", "RESTITUEE", "SUPPRIMEE"];

// StatutCorrespondance (à vérifier avec le prof)
const STATUT_CORRESPONDANCE = ["PROPOSEE", "A_VERIFIER", "ACCEPTEE", "REFUSEE"];

// TypeNotification
const TYPE_NOTIFICATION = [
  "NOUVELLE_CORRESPONDANCE",
  "CORRESPONDANCE_ACCEPTEE",
  "CORRESPONDANCE_REFUSEE",
  "NOUVEAU_MESSAGE",
  "STATUT_MODIFIE",
  "SIGNALEMENT_TRAITE",
  "OBJET_RESTITUE"
];

// MotifSignalement
const MOTIF_SIGNALEMENT = [
  "FAUSSE_DECLARATION",
  "CONTENU_INAPPROPRIE",
  "DOUBLON",
  "INFORMATION_INCORRECTE",
  "AUTRE"
];

module.exports = {
  ROLES,
  TYPE_DECLARATION,
  STATUT_DECLARATION,
  STATUT_CORRESPONDANCE,
  TYPE_NOTIFICATION,
  MOTIF_SIGNALEMENT
};
