/* ============================================================
 * scripts/test-search-services-avances.js
 *
 * Tests avancés des trois services de recherche.
 * ============================================================ */

require("dotenv").config();

const mongoose = require("mongoose");

const Declaration = require("../src/models/Declaration");
const Categorie = require("../src/models/Categorie");
const Zone = require("../src/models/Zone");

const { getMemberHistory } = require("../src/services/memberHistory.service");

const { searchCategories } = require("../src/services/categorySearch.service");

const { searchZones } = require("../src/services/zoneSearch.service");

// Exécute un test sans arrêter les autres en cas d'erreur.
async function tester(nom, fonction) {
  try {
    const resultat = await fonction();

    console.log(`\n[OK] ${nom}`);
    if (resultat !== undefined) {
      console.log(resultat);
    }
  } catch (error) {
    console.log(`\n[ECHEC] ${nom}`);
    console.log(error.message);
  }
}

function verifier(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function testsAvances() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("URI MongoDB introuvable dans .env");
    }

    await mongoose.connect(uri);
    console.log("\nConnexion MongoDB réussie !");

    // Récupération de données existantes pour les tests.
    const declaration = await Declaration.findOne().lean();
    const categorie = await Categorie.findOne().lean();
    const zone = await Zone.findOne().lean();

    if (!declaration) {
      throw new Error("Aucune déclaration dans la base.");
    }

    if (!categorie) {
      throw new Error("Aucune catégorie dans la base.");
    }

    if (!zone) {
      throw new Error("Aucune zone dans la base.");
    }

    const memberId = declaration.auteurId.toString();

    console.log("\n==================================");
    console.log("TESTS AVANCES : HISTORIQUE MEMBRE");
    console.log("==================================");

    // TEST 1 : recherche par mot-clé.
    await tester("Historique avec mot-clé", async () => {
      const motCle = declaration.titre.split(/\s+/)[0];

      const resultat = await getMemberHistory(
        memberId,
        { keyword: motCle },
        { page: 1, limit: 10 },
      );

      console.log("Mot-clé utilisé :", motCle);
      console.log("Résultats :", resultat.data.length);

      verifier(
        resultat.data.every((item) => item.auteurId.toString() === memberId),
        "Une déclaration ne correspondant pas au membre a été trouvée.",
      );

      verifier(
        resultat.data.length > 0,
        "Aucun résultat pour le mot-clé de la déclaration.",
      );

      return "Recherche par mot-clé réussie.";
    });

    // TEST 2 : filtre par statut.
    await tester("Historique avec filtre par statut", async () => {
      const resultat = await getMemberHistory(
        memberId,
        { statut: declaration.statut },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.every((item) => item.statut === declaration.statut),
        "Un résultat possède un statut incorrect.",
      );

      return `Statut : ${declaration.statut} | Résultats : ${resultat.data.length}`;
    });

    // TEST 3 : filtre par catégorie.
    await tester("Historique avec filtre par catégorie", async () => {
      const resultat = await getMemberHistory(
        memberId,
        { categorieId: declaration.categorieId.toString() },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.every((item) =>
          item.categorieId._id
            ? item.categorieId._id.toString() ===
              declaration.categorieId.toString()
            : item.categorieId.toString() ===
              declaration.categorieId.toString(),
        ),
        "Une déclaration possède une catégorie incorrecte.",
      );

      return `Résultats : ${resultat.data.length}`;
    });

    // TEST 4 : filtre par zone.
    await tester("Historique avec filtre par zone", async () => {
      const resultat = await getMemberHistory(
        memberId,
        { zoneId: declaration.zoneId.toString() },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.every((item) =>
          item.zoneId._id
            ? item.zoneId._id.toString() === declaration.zoneId.toString()
            : item.zoneId.toString() === declaration.zoneId.toString(),
        ),
        "Une déclaration possède une zone incorrecte.",
      );

      return `Résultats : ${resultat.data.length}`;
    });

    // TEST 5 : filtre par date de l'événement.
    await tester("Historique avec filtre dateEvenement", async () => {
      const date = new Date(declaration.dateEvenement);

      const debut = new Date(date);
      debut.setDate(debut.getDate() - 1);

      const fin = new Date(date);
      fin.setDate(fin.getDate() + 1);

      const resultat = await getMemberHistory(
        memberId,
        {
          dateDebut: debut.toISOString(),
          dateFin: fin.toISOString(),
        },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.every((item) => {
          const d = new Date(item.dateEvenement);
          return d >= debut && d <= fin;
        }),
        "Une date d'événement est hors de la période.",
      );

      return `Période : ${debut.toISOString()} -> ${fin.toISOString()} | Résultats : ${resultat.data.length}`;
    });

    // TEST 6 : filtre par date de création.
    await tester("Historique avec filtre dateCreation", async () => {
      const date = new Date(declaration.dateCreation);

      const debut = new Date(date);
      debut.setDate(debut.getDate() - 1);

      const fin = new Date(date);
      fin.setDate(fin.getDate() + 1);

      const resultat = await getMemberHistory(
        memberId,
        {
          dateCreationDebut: debut.toISOString(),
          dateCreationFin: fin.toISOString(),
        },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.every((item) => {
          const d = new Date(item.dateCreation);
          return d >= debut && d <= fin;
        }),
        "Une date de création est hors de la période.",
      );

      return `Résultats : ${resultat.data.length}`;
    });

    // TEST 7 : tri récent et ancien.
    await tester("Tri récent et ancien", async () => {
      const [recent, ancien] = await Promise.all([
        getMemberHistory(memberId, {}, { page: 1, limit: 100, sort: "recent" }),
        getMemberHistory(memberId, {}, { page: 1, limit: 100, sort: "ancien" }),
      ]);

      const datesRecent = recent.data.map((item) =>
        new Date(item.dateCreation).getTime(),
      );

      const datesAncien = ancien.data.map((item) =>
        new Date(item.dateCreation).getTime(),
      );

      verifier(
        datesRecent.every((date, i) => i === 0 || datesRecent[i - 1] >= date),
        "Le tri récent est incorrect.",
      );

      verifier(
        datesAncien.every((date, i) => i === 0 || datesAncien[i - 1] <= date),
        "Le tri ancien est incorrect.",
      );

      return `Tri récent : ${datesRecent.length} | Tri ancien : ${datesAncien.length}`;
    });

    // TEST 8 : pagination.
    await tester("Pagination de l'historique", async () => {
      const page1 = await getMemberHistory(memberId, {}, { page: 1, limit: 1 });

      const page2 = await getMemberHistory(memberId, {}, { page: 2, limit: 1 });

      verifier(
        page1.data.length <= 1 && page2.data.length <= 1,
        "La limite de pagination n'est pas respectée.",
      );

      verifier(
        page1.pagination.page === 1 && page2.pagination.page === 2,
        "Les numéros de page sont incorrects.",
      );

      return `Total : ${page1.pagination.total} | Page 1 : ${page1.data.length} | Page 2 : ${page2.data.length}`;
    });

    // TEST 9 : recherche sans résultat dans l'historique.
    await tester("Historique sans résultat", async () => {
      const resultat = await getMemberHistory(
        memberId,
        { keyword: "zzzzmotintrouvable987654" },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.length === 0,
        "La recherche aurait dû retourner zéro résultat.",
      );

      return "Aucun résultat : comportement correct.";
    });

    console.log("\n==================================");
    console.log("TESTS AVANCES : CATEGORIES");
    console.log("==================================");

    // TEST 10 : recherche partielle de catégorie.
    await tester("Recherche partielle de catégorie", async () => {
      const motCle = categorie.nom.substring(
        0,
        Math.min(3, categorie.nom.length),
      );

      const resultat = await searchCategories(
        { keyword: motCle },
        { page: 1, limit: 10, sort: "nom_asc" },
      );

      const trouvee = resultat.data.some(
        (item) => item._id.toString() === categorie._id.toString(),
      );

      verifier(trouvee, "La catégorie attendue n'a pas été retrouvée.");

      return `Mot-clé : ${motCle} | Résultats : ${resultat.data.length}`;
    });

    // TEST 11 : tri des catégories.
    await tester("Tri des catégories", async () => {
      const resultat = await searchCategories(
        {},
        { page: 1, limit: 100, sort: "nom_asc" },
      );

      const noms = resultat.data.map((item) => item.nom);

      verifier(
        noms.every((nom, i) => i === 0 || noms[i - 1].localeCompare(nom) <= 0),
        "Les catégories ne sont pas triées par ordre alphabétique.",
      );

      return `Catégories triées : ${noms.length}`;
    });

    // TEST 12 : catégorie inexistante.
    await tester("Recherche catégorie sans résultat", async () => {
      const resultat = await searchCategories(
        { keyword: "zzzzcategorie987654" },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.length === 0,
        "La recherche aurait dû retourner zéro catégorie.",
      );

      return "Aucun résultat : comportement correct.";
    });

    console.log("\n==================================");
    console.log("TESTS AVANCES : ZONES");
    console.log("==================================");

    // TEST 13 : recherche partielle de zone.
    await tester("Recherche partielle de zone", async () => {
      const motCle = zone.nom.substring(0, Math.min(3, zone.nom.length));

      const resultat = await searchZones(
        { keyword: motCle },
        { page: 1, limit: 10, sort: "nom_asc" },
      );

      const trouvee = resultat.data.some(
        (item) => item._id.toString() === zone._id.toString(),
      );

      verifier(trouvee, "La zone attendue n'a pas été retrouvée.");

      return `Mot-clé : ${motCle} | Résultats : ${resultat.data.length}`;
    });

    // TEST 14 : recherche dans l'emplacement.
    await tester("Recherche dans emplacement", async () => {
      if (!zone.emplacement) {
        return "Test ignoré : cette zone ne possède pas d'emplacement.";
      }

      const motCle = zone.emplacement.substring(
        0,
        Math.min(3, zone.emplacement.length),
      );

      const resultat = await searchZones(
        { keyword: motCle },
        { page: 1, limit: 10 },
      );

      const trouvee = resultat.data.some(
        (item) => item._id.toString() === zone._id.toString(),
      );

      verifier(trouvee, "La zone n'a pas été retrouvée par emplacement.");

      return `Emplacement recherché : ${motCle}`;
    });

    // TEST 15 : tri des zones.
    await tester("Tri des zones", async () => {
      const resultat = await searchZones(
        {},
        { page: 1, limit: 100, sort: "nom_asc" },
      );

      const noms = resultat.data.map((item) => item.nom);

      verifier(
        noms.every((nom, i) => i === 0 || noms[i - 1].localeCompare(nom) <= 0),
        "Les zones ne sont pas triées par ordre alphabétique.",
      );

      return `Zones triées : ${noms.length}`;
    });

    // TEST 16 : zone inexistante.
    await tester("Recherche zone sans résultat", async () => {
      const resultat = await searchZones(
        { keyword: "zzzzzone987654" },
        { page: 1, limit: 10 },
      );

      verifier(
        resultat.data.length === 0,
        "La recherche aurait dû retourner zéro zone.",
      );

      return "Aucun résultat : comportement correct.";
    });

    console.log("\n==================================");
    console.log("FIN DES TESTS AVANCES");
    console.log("==================================");
  } catch (error) {
    console.error("\nERREUR GENERALE :", error.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("\nConnexion MongoDB fermée.");
  }
}

testsAvances();
