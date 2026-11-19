/* =====================================================================
   src/services/aiMatching.service.js
   Service IA 100 % Node.js (Sécurisé & Multi-critères) :
   - NLP (texte français) : Xenova/paraphrase-multilingual-MiniLM-L12-v2
   - Computer Vision (images) : Xenova/clip-vit-base-patch32
   - Sécurité : Anti-SSRF sur les URLs d'images, timeout réseau,
     cohérence chronologique (perdu avant trouvé) et pondération dynamique
   ===================================================================== */

let textExtractor = null;
let imageExtractor = null;
let cosSimFn = null;
let loadingPromise = null;

const IMAGE_TIMEOUT_MS = 10000; // Timeout max de 10s pour charger une image externe

// Charge les modèles IA une seule fois en mémoire (protégé contre les appels concurrents)
async function chargerModelesIA() {
  if (textExtractor && imageExtractor && cosSimFn) return;

  if (!loadingPromise) {
    loadingPromise = (async () => {
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
    })().catch((err) => {
      loadingPromise = null;
      throw err;
    });
  }

  await loadingPromise;
}

// Ramène un score entre 0 et 1 en évitant tout NaN
function borner01(valeur) {
  const num = Number(valeur);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, Number(num.toFixed(4))));
}

// Sécurité Anti-SSRF : autorise uniquement les URLs publiques http/https
function estUrlImageSecurisee(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    // Bloquer localhost et les plages réseau privées/internes
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Exécute une promesse avec un délai maximum pour éviter tout blocage serveur
function avecTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout chargement image")), ms),
    ),
  ]);
}

// 1. Score Texte (NLP) entre 0 et 1
async function calculerScoreTexte(dec1, dec2) {
  const texte1 = `${dec1.titre || ""}. ${dec1.description || ""}`
    .trim()
    .replace(/\s+/g, " ");
  const texte2 = `${dec2.titre || ""}. ${dec2.description || ""}`
    .trim()
    .replace(/\s+/g, " ");

  try {
    await chargerModelesIA();

    const vec1 = await textExtractor(texte1, {
      pooling: "mean",
      normalize: true,
    });
    const vec2 = await textExtractor(texte2, {
      pooling: "mean",
      normalize: true,
    });

    const similarite = cosSimFn(vec1.data, vec2.data);
    return {
      scoreTexte: borner01(similarite),
      modeleTexte: "paraphrase-multilingual-MiniLM-L12-v2",
    };
  } catch (err) {
    // Secours par mots-clés communs en cas d'indisponibilité du modèle
    const mots1 = new Set(texte1.toLowerCase().split(/\W+/));
    const mots2 = new Set(texte2.toLowerCase().split(/\W+/));
    let communs = 0;
    mots1.forEach((m) => {
      if (m.length > 2 && mots2.has(m)) communs++;
    });
    return {
      scoreTexte: borner01(communs / Math.max(mots1.size, 1)),
      modeleTexte: "fallback-mots-cles",
    };
  }
}

// 2. Score Photo (Computer Vision CLIP) entre 0 et 1
async function calculerScorePhoto(dec1, dec2) {
  if (
    !estUrlImageSecurisee(dec1.photoUrl) ||
    !estUrlImageSecurisee(dec2.photoUrl)
  ) {
    return { scorePhoto: 0, photoUtilisee: false };
  }

  try {
    await chargerModelesIA();
    const [img1, img2] = await avecTimeout(
      Promise.all([
        imageExtractor(dec1.photoUrl.trim()),
        imageExtractor(dec2.photoUrl.trim()),
      ]),
      IMAGE_TIMEOUT_MS,
    );

    const similarite = cosSimFn(img1.data, img2.data);
    return { scorePhoto: borner01(similarite), photoUtilisee: true };
  } catch (err) {
    // Si l'URL est morte ou expire, on bascule proprement sur le mode sans photo
    return { scorePhoto: 0, photoUtilisee: false };
  }
}

// 3. Score Catégorie (1 si identique, 0 sinon)
function calculerScoreCategorie(dec1, dec2) {
  if (!dec1.categorieId || !dec2.categorieId) return 0;
  return String(dec1.categorieId) === String(dec2.categorieId) ? 1 : 0;
}

// 4. Score Lieu / Zone (1 si même zone, 0.3 si zone différente dans le même centre)
function calculerScoreLieu(dec1, dec2) {
  if (!dec1.zoneId || !dec2.zoneId) return 0.3;
  return String(dec1.zoneId) === String(dec2.zoneId) ? 1 : 0.3;
}

// 5. Score Date avec cohérence chronologique (objet trouvé après avoir été perdu)
function calculerScoreDate(decPerdue, decTrouvee) {
  const datePerdue = new Date(decPerdue.dateCreation);
  const dateTrouvee = new Date(decTrouvee.dateCreation);

  if (
    Number.isNaN(datePerdue.getTime()) ||
    Number.isNaN(dateTrouvee.getTime())
  ) {
    return 0.5;
  }

  const msParJour = 1000 * 60 * 60 * 24;
  // Positif si trouvé APRÈS la perte, négatif si trouvé AVANT la perte
  const ecartJours = (dateTrouvee - datePerdue) / msParJour;

  // Incohérence chronologique : trouvé plus de 24h avant d'être déclaré perdu
  if (ecartJours < -7) return 0.05;
  if (ecartJours < -1) return 0.15;

  // Trouvé le même jour (avec tolérance de 24h pour les déclarations décalées)
  if (ecartJours <= 1) return 1;

  // Trop ancien (> 90 jours)
  if (ecartJours > 90) return 0.1;

  // Décroissance progressive sur 30 jours
  return borner01(Math.max(0.2, 1 - ecartJours / 30));
}

// Fonction principale : calcule les 5 scores + le scoreGlobal pondéré
async function analyserPaireDeclarations(decPerdue, decTrouvee) {
  const { scoreTexte, modeleTexte } = await calculerScoreTexte(
    decPerdue,
    decTrouvee,
  );
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
    // Redistribution dynamique si l'une des photos est absente ou inaccessible
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
    modeleTexte,
  };
}

module.exports = {
  analyserPaireDeclarations,
};
