/* ============================================================
 * scripts/test-search-services.js
 *
 * Test des trois services de recherche :
 * 1. Historique du membre
 * 2. Recherche des catégories
 * 3. Recherche des zones
 * ============================================================ */

require("dotenv").config();

const mongoose = require("mongoose");

const Declaration = require("../src/models/Declaration");
const Categorie = require("../src/models/Categorie");
const Zone = require("../src/models/Zone");

const { getMemberHistory } = require("../src/services/memberHistory.service");

const { searchCategories } = require("../src/services/categorySearch.service");

const { searchZones } = require("../src/services/zoneSearch.service");

async function testerServices() {
  try {
    // 1. Connexion à MongoDB
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        "URI MongoDB introuvable dans le fichier .env. Vérifie le nom de ta variable.",
      );
    }

    await mongoose.connect(uri);
    console.log("\nConnexion MongoDB réussie !");

    // ========================================================
    // TEST 1 : HISTORIQUE DU MEMBRE
    // ========================================================

    console.log("\n=================================");
    console.log("TEST 1 : HISTORIQUE DU MEMBRE");
    console.log("=================================");

    // On récupère une déclaration existante pour obtenir
    // l'identifiant réel de son auteur.
    const declaration = await Declaration.findOne().lean();

    if (!declaration) {
      console.log("Aucune déclaration disponible pour le test.");
    } else {
      const memberId = declaration.auteurId.toString();

      const historique = await getMemberHistory(
        memberId,
        {},
        {
          page: 1,
          limit: 10,
          sort: "recent",
        },
      );

      console.log("Historique récupéré !");
      console.log("Nombre de résultats :", historique.data.length);
      console.log("Total :", historique.pagination.total);

      // Vérification : chaque déclaration doit appartenir
      // au membre utilisé pour le test.
      const historiqueCorrect = historique.data.every(
        (item) => item.auteurId.toString() === memberId,
      );

      console.log(
        "Vérification auteurId :",
        historiqueCorrect ? "OK" : "ERREUR",
      );

      // Test avec un filtre de type.
      const historiqueFiltre = await getMemberHistory(
        memberId,
        { type: declaration.type },
        { page: 1, limit: 10 },
      );

      console.log(
        "Test filtre par type :",
        historiqueFiltre.data.every((item) => item.type === declaration.type)
          ? "OK"
          : "ERREUR",
      );
    }

    // ========================================================
    // TEST 2 : RECHERCHE DES CATEGORIES
    // ========================================================

    console.log("\n=================================");
    console.log("TEST 2 : RECHERCHE DES CATEGORIES");
    console.log("=================================");

    const premiereCategorie = await Categorie.findOne().lean();

    if (!premiereCategorie) {
      console.log("Aucune catégorie disponible pour le test.");
    } else {
      const resultatCategories = await searchCategories(
        { keyword: premiereCategorie.nom },
        {
          page: 1,
          limit: 10,
          sort: "nom_asc",
        },
      );

      console.log("Recherche catégorie :", premiereCategorie.nom);
      console.log("Résultats :", resultatCategories.data.length);
      console.log("Total :", resultatCategories.pagination.total);

      const categorieTrouvee = resultatCategories.data.some(
        (item) => item._id.toString() === premiereCategorie._id.toString(),
      );

      console.log(
        "Vérification recherche catégorie :",
        categorieTrouvee ? "OK" : "ERREUR",
      );
    }

    // ========================================================
    // TEST 3 : RECHERCHE DES ZONES
    // ========================================================

    console.log("\n=================================");
    console.log("TEST 3 : RECHERCHE DES ZONES");
    console.log("=================================");

    const premiereZone = await Zone.findOne().lean();

    if (!premiereZone) {
      console.log("Aucune zone disponible pour le test.");
    } else {
      const resultatZones = await searchZones(
        { keyword: premiereZone.nom },
        {
          page: 1,
          limit: 10,
          sort: "nom_asc",
        },
      );

      console.log("Recherche zone :", premiereZone.nom);
      console.log("Résultats :", resultatZones.data.length);
      console.log("Total :", resultatZones.pagination.total);

      const zoneTrouvee = resultatZones.data.some(
        (item) => item._id.toString() === premiereZone._id.toString(),
      );

      console.log(
        "Vérification recherche zone :",
        zoneTrouvee ? "OK" : "ERREUR",
      );
    }

    console.log("\n=================================");
    console.log("FIN DES TESTS");
    console.log("=================================");
  } catch (error) {
    console.error("\nERREUR :", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nConnexion MongoDB fermée.");
  }
}

testerServices();
