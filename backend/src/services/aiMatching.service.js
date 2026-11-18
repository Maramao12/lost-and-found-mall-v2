/* =====================================================================
   src/services/aiMatching.service.js
   Service IA 100 % Node.js :
   - NLP (texte français) : Xenova/paraphrase-multilingual-MiniLM-L12-v2
   - Computer Vision (images) : Xenova/clip-vit-base-patch32
   ===================================================================== */

let textExtractor = null;
let imageExtractor = null;
let cosSimFn = null;

// Charge les modèles IA une seule fois en mémoire au premier appel
async function chargerModelesIA() {
  if (!textExtractor || !imageExtractor) {
    const { pipeline, cos_sim } = await import("@xenova/transformers");
    cosSimFn = cos_sim;

    if (!textExtractor) {
      textExtractor = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      );
    }
    if (!imageExtractor) {
      imageExtractor = await pipeline(
        "image-feature-extraction",
        "Xenova/clip-vit-base-patch32",
      );
    }
  }
}

// Ramène un score entre 0 et 1
function borner01(valeur) {
  return Math.max(0, Math.min(1, Number(valeur.toFixed(4))));
}

// 1. Score Texte (NLP) entre 0 et 1
async function calculerScoreTexte(dec1, dec2) {
  try {
    await chargerModelesIA();
    const texte1 = `${dec1.titre}. ${dec1.description}`;
    const texte2 = `${dec2.titre}. ${dec2.description}`;

    const vec1 = await textExtractor(texte1, {
      pooling: "mean",
      normalize: true,
    });
    const vec2 = await textExtractor(texte2, {
      pooling: "mean",
      normalize: true,
    });

    const similarite = cosSimFn(vec1.data, vec2.data);
    return borner01(similarite);
  } catch (err) {
    // Secours par mots-clés communs si le modèle met du temps à télécharger
    const mots1 = new Set(
      `${dec1.titre} ${dec1.description}`.toLowerCase().split(/\W+/),
    );
    const mots2 = new Set(
      `${dec2.titre} ${dec2.description}`.toLowerCase().split(/\W+/),
    );
    let communs = 0;
    mots1.forEach((m) => {
      if (m.length > 2 && mots2.has(m)) communs++;
    });
    return borner01(communs / Math.max(mots1.size, 1));
  }
}

// 2. Score Photo (Computer Vision CLIP) entre 0 et 1
async function calculerScorePhoto(dec1, dec2) {
  if (!dec1.photoUrl || !dec2.photoUrl) {
    return { scorePhoto: 0, photoUtilisee: false };
  }

  try {
    await chargerModelesIA();
    const img1 = await imageExtractor(dec1.photoUrl);
    const img2 = await imageExtractor(dec2.photoUrl);

    const similarite = cosSimFn(img1.data, img2.data);
    return { scorePhoto: borner01(similarite), photoUtilisee: true };
  } catch (err) {
    return { scorePhoto: 0, photoUtilisee: false };
  }
}

// 3. Score Catégorie (1 si identique, 0 sinon)
function calculerScoreCategorie(dec1, dec2) {
  return String(dec1.categorieId) === String(dec2.categorieId) ? 1 : 0;
}

// 4. Score Lieu / Zone (1 si même zone, 0.3 si zone différente)
function calculerScoreLieu(dec1, dec2) {
  return String(dec1.zoneId) === String(dec2.zoneId) ? 1 : 0.3;
}

// 5. Score Date (1 si même jour, pénalité après 90 jours)
function calculerScoreDate(dec1, dec2) {
  const msParJour = 1000 * 60 * 60 * 24;
  const diffJours =
    Math.abs(new Date(dec1.dateCreation) - new Date(dec2.dateCreation)) /
    msParJour;

  if (diffJours > 90) return 0.1;
  if (diffJours <= 1) return 1;
  return borner01(Math.max(0.2, 1 - diffJours / 30));
}

// Fonction principale : calcule les 5 scores + le scoreGlobal pondéré
async function analyserPaireDeclarations(decPerdue, decTrouvee) {
  const scoreTexte = await calculerScoreTexte(decPerdue, decTrouvee);
  const { scorePhoto, photoUtilisee } = await calculerScorePhoto(
    decPerdue,
    decTrouvee,
  );
  const scoreCategorie = calculerScoreCategorie(decPerdue, decTrouvee);
  const scoreLieu = calculerScoreLieu(decPerdue, decTrouvee);
  const scoreDate = calculerScoreDate(decPerdue, decTrouvee);

  let scoreGlobal;
  if (photoUtilisee) {
    // 40% photo + 30% texte + 15% lieu + 10% date + 5% catégorie
    scoreGlobal =
      0.4 * scorePhoto +
      0.3 * scoreTexte +
      0.15 * scoreLieu +
      0.1 * scoreDate +
      0.05 * scoreCategorie;
  } else {
    // Redistribution automatique s'il n'y a pas de photo
    scoreGlobal =
      0.5 * scoreTexte +
      0.25 * scoreLieu +
      0.15 * scoreDate +
      0.1 * scoreCategorie;
  }

  return {
    scorePhoto,
    scoreTexte,
    scoreLieu,
    scoreDate,
    scoreCategorie,
    scoreGlobal: borner01(scoreGlobal),
    modeleImage: photoUtilisee ? "clip-vit-base-patch32" : "aucune-photo",
    modeleTexte: "paraphrase-multilingual-MiniLM-L12-v2",
  };
}

module.exports = {
  analyserPaireDeclarations,
};
