/* =====================================================================
   backend/scripts/seed-perf.js
   Insère des déclarations de test pour mesurer les performances.

   Usage (depuis le dossier backend) :
     node scripts/seed-perf.js 20000    -> insère 20 000 déclarations
     node scripts/seed-perf.js clean    -> supprime uniquement les données de test
   ===================================================================== */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const OBJETS = [
  "Sac à dos",
  "Sac à main",
  "Téléphone",
  "Clés",
  "Portefeuille",
  "Lunettes",
  "Veste",
  "Écharpe",
  "Casque audio",
  "Parapluie",
  "Montre",
  "Carte bancaire",
  "Ordinateur portable",
  "Bouteille",
  "Doudou",
];
const COULEURS = [
  "noir",
  "bleu",
  "rouge",
  "vert",
  "gris",
  "blanc",
  "marron",
  "rose",
];
const MARQUES = [
  "Nike",
  "Samsung",
  "Apple",
  "Adidas",
  "Zara",
  "Huawei",
  "Lacoste",
  "sans marque",
];
const LIEUX = [
  "près du food court",
  "à l'entrée principale",
  "au parking",
  "devant le cinéma",
  "près des escaliers",
  "dans une boutique",
  "à la caisse",
  "sur un banc",
];
const JOUR = 24 * 3600 * 1000;

function alea(tableau) {
  return tableau[Math.floor(Math.random() * tableau.length)];
}

// Répartition réaliste : la plupart des déclarations sont publiées
function statutAleatoire() {
  const r = Math.random();
  if (r < 0.7) return "PUBLIEE";
  if (r < 0.8) return "EN_COURS";
  if (r < 0.95) return "RESTITUEE";
  return "SUPPRIMEE";
}

function genererDeclaration(utilisateurs, categories, zones) {
  const type = Math.random() < 0.5 ? "PERDU" : "TROUVE";
  const objet = alea(OBJETS);
  const couleur = alea(COULEURS);
  const verbe = type === "PERDU" ? "perdu" : "trouvé";

  // dateEvenement : un jour des 365 derniers jours
  const dateEvenement = new Date(
    Date.now() - Math.floor(Math.random() * 365 * JOUR),
  );
  // dateCreation : 0 à 3 jours après l'événement (sans dépasser maintenant)
  const dateCreation = new Date(
    Math.min(
      Date.now(),
      dateEvenement.getTime() + Math.floor(Math.random() * 3 * JOUR),
    ),
  );

  return {
    type: type,
    titre: objet + " " + couleur + " " + verbe,
    description:
      objet +
      " " +
      couleur +
      " de marque " +
      alea(MARQUES) +
      ", " +
      verbe +
      " " +
      alea(LIEUX) +
      ".",
    dateEvenement: dateEvenement,
    dateCreation: dateCreation,
    dateModification: dateCreation,
    statut: statutAleatoire(),
    auteurId: alea(utilisateurs),
    categorieId: alea(categories),
    zoneId: alea(zones),
    _perf: true, // marqueur : permet de supprimer uniquement ces données
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI absente : vérifiez backend/.env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const declarations = db.collection("declarations");

  if (process.argv[2] === "clean") {
    const r = await declarations.deleteMany({ _perf: true });
    console.log(r.deletedCount + " déclarations de test supprimées.");
    await mongoose.disconnect();
    return;
  }

  const nb = Number(process.argv[2] || 20000);
  if (!Number.isInteger(nb) || nb < 1 || nb > 200000) {
    console.error(
      "Usage : node scripts/seed-perf.js <nombre entre 1 et 200000> | clean",
    );
    process.exit(1);
  }

  const ids = async function (nom) {
    const docs = await db
      .collection(nom)
      .find({}, { projection: { _id: 1 } })
      .toArray();
    return docs.map(function (d) {
      return d._id;
    });
  };
  const utilisateurs = await ids("utilisateurs");
  const categories = await ids("categories");
  const zones = await ids("zones");
  if (!utilisateurs.length || !categories.length || !zones.length) {
    console.error(
      "Il faut au moins un utilisateur, une catégorie et une zone (script de la base).",
    );
    process.exit(1);
  }

  // Insertion par lots de 1000
  for (let i = 0; i < nb; i += 1000) {
    const lot = [];
    for (let j = i; j < Math.min(i + 1000, nb); j++) {
      lot.push(genererDeclaration(utilisateurs, categories, zones));
    }
    await declarations.insertMany(lot, { ordered: false });
    process.stdout.write(".");
  }
  console.log("\n" + nb + " déclarations de test insérées.");
  console.log(
    "Total dans la collection : " + (await declarations.countDocuments()),
  );
  await mongoose.disconnect();
}

main().catch(function (e) {
  console.error(e.message);
  process.exit(1);
});
