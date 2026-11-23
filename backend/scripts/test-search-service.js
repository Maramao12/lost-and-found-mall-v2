const mongoose = require("mongoose");
require("dotenv").config();

// Importer les modèles pour que Mongoose puisse les utiliser avec populate()
const Declaration = require("../src/models/Declaration");
require("../src/models/Categorie");
require("../src/models/Zone");
require("../src/models/Utilisateur");

const { searchDeclarations } = require("../src/services/search.service");

const MONGO_URI = process.env.MONGODB_URI;

async function executerTest(nom, fonction) {
  try {
    console.log(`\n[TEST] ${nom}`);
    await fonction();
    console.log(`[OK] ${nom}`);
  } catch (error) {
    console.error(`[ECHEC] ${nom}`);
    console.error(error.message);
  }
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connexion MongoDB réussie !");

    console.log("\n==================================");
    console.log("TESTS : SEARCH SERVICE ADMIN");
    console.log("==================================");

    // Récupération des données existantes
    const declaration = await Declaration.findOne().lean();

    if (!declaration) {
      console.log("Aucune déclaration disponible pour effectuer les tests.");
      return;
    }

    const categorieId = declaration.categorieId?.toString();
    const zoneId = declaration.zoneId?.toString();

    // Test 1 : recherche générale
    await executerTest("Recherche générale des déclarations", async () => {
      const resultat = await searchDeclarations();

      console.log("Nombre de résultats :", resultat.data.length);
      console.log("Total :", resultat.pagination.total);
    });

    // Test 2 : recherche par mot-clé
    await executerTest("Recherche par mot-clé", async () => {
      const resultat = await searchDeclarations({
        keyword: "Sac",
      });

      console.log("Résultats :", resultat.data.length);
    });

    // Test 3 : filtrage par type
    await executerTest("Filtrage par type", async () => {
      const resultat = await searchDeclarations({
        type: declaration.type,
      });

      console.log("Type recherché :", declaration.type);
      console.log("Résultats :", resultat.data.length);
    });

    // Test 4 : filtrage par statut
    await executerTest("Filtrage par statut", async () => {
      const resultat = await searchDeclarations({
        statut: declaration.statut,
      });

      console.log("Statut recherché :", declaration.statut);
      console.log("Résultats :", resultat.data.length);
    });

    // Test 5 : filtrage par catégorie
    await executerTest("Filtrage par catégorie", async () => {
      if (!categorieId) {
        throw new Error("La déclaration ne possède pas de catégorie.");
      }

      const resultat = await searchDeclarations({
        categorieId,
      });

      console.log("Résultats :", resultat.data.length);
    });

    // Test 6 : filtrage par zone
    await executerTest("Filtrage par zone", async () => {
      if (!zoneId) {
        throw new Error("La déclaration ne possède pas de zone.");
      }

      const resultat = await searchDeclarations({
        zoneId,
      });

      console.log("Résultats :", resultat.data.length);
    });

    // Test 7 : filtrage par date de l'événement
    await executerTest("Filtrage par date de l'événement", async () => {
      const debut = new Date(declaration.dateEvenement);
      const fin = new Date(declaration.dateEvenement);

      // Format attendu par le service : YYYY-MM-DD
      const dateDebut = debut.toISOString().slice(0, 10);
      const dateFin = fin.toISOString().slice(0, 10);

      const resultat = await searchDeclarations({
        dateDebut,
        dateFin,
      });

      console.log("Date début :", dateDebut);
      console.log("Date fin :", dateFin);
      console.log("Résultats :", resultat.data.length);
    });

    // Test 8 : tri des déclarations récentes
    await executerTest("Tri des déclarations récentes", async () => {
      const resultat = await searchDeclarations({}, { sort: "recent" });

      console.log("Résultats :", resultat.data.length);
    });

    // Test 9 : tri des déclarations anciennes
    await executerTest("Tri des déclarations anciennes", async () => {
      const resultat = await searchDeclarations({}, { sort: "ancien" });

      console.log("Résultats :", resultat.data.length);
    });

    // Test 10 : tri par événement récent
    await executerTest("Tri par événement récent", async () => {
      const resultat = await searchDeclarations(
        {},
        { sort: "evenement_recent" },
      );

      console.log("Résultats :", resultat.data.length);
    });

    // Test 11 : tri par événement ancien
    await executerTest("Tri par événement ancien", async () => {
      const resultat = await searchDeclarations(
        {},
        { sort: "evenement_ancien" },
      );

      console.log("Résultats :", resultat.data.length);
    });

    // Test 12 : pagination
    await executerTest("Pagination des déclarations", async () => {
      const page1 = await searchDeclarations({}, { page: 1, limit: 5 });

      const page2 = await searchDeclarations({}, { page: 2, limit: 5 });

      console.log("Total :", page1.pagination.total);
      console.log("Résultats page 1 :", page1.data.length);
      console.log("Résultats page 2 :", page2.data.length);
      console.log("Nombre total de pages :", page1.pagination.totalPages);
    });

    // Test 13 : plusieurs filtres combinés
    await executerTest(
      "Recherche avec plusieurs filtres combinés",
      async () => {
        const filtres = {
          type: declaration.type,
          statut: declaration.statut,
        };

        if (categorieId) filtres.categorieId = categorieId;
        if (zoneId) filtres.zoneId = zoneId;

        const resultat = await searchDeclarations(filtres);

        console.log("Filtres appliqués :", filtres);
        console.log("Résultats :", resultat.data.length);
      },
    );

    // Test 14 : recherche sans résultat
    await executerTest("Recherche sans résultat", async () => {
      const resultat = await searchDeclarations({
        keyword: "zzzzmotintrouvable12345",
      });

      console.log("Résultats :", resultat.data.length);

      if (resultat.data.length === 0) {
        console.log("Aucun résultat : comportement correct.");
      }
    });
  } catch (error) {
    console.error("\nErreur générale :", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\nConnexion MongoDB fermée.");
  }
}

main();
