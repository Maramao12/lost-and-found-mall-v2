# Performances de la recherche des déclarations

Jeu de test : 20 000 déclarations générées par `backend/scripts/seed-perf.js`
(50 % PERDU / 50 % TROUVE, 70 % PUBLIEE, dates sur 365 jours).
Mesures faites avec `explain("executionStats")` sur la requête du service (`limit(10)`).

| Scénario                                       | Avant : plan, docs examinés | Après : plan, docs examinés        |
| ---------------------------------------------- | --------------------------- | ---------------------------------- |
| 1 sans filtre, tri récent                      | COLLSCAN + SORT, 20 004     | IXSCAN idx_tri_creation, 10        |
| 2 type seul, tri récent                        | IXSCAN + SORT, 9 931        | IXSCAN idx_tri_creation, 23        |
| 3 type + statut, tri récent                    | IXSCAN + SORT, 7 031        | IXSCAN idx_tri_creation, 29        |
| 4 type + statut + zone + catégorie, tri récent | IXSCAN + SORT, 819          | IXSCAN idx_recherche_creation, 10  |
| 5 période, tri événement                       | COLLSCAN + SORT, 20 004     | IXSCAN idx_tri_evenement, 10       |
| 6 tout combiné, tri événement                  | IXSCAN + SORT, 819          | IXSCAN idx_recherche_evenement, 10 |
| 7 statut RESTITUEE seul, tri récent            | COLLSCAN + SORT, 20 004     | IXSCAN idx_tri_creation, 60        |

Les temps d'exécution (de 0 à 53 ms) ne sont pas retenus : sur 20 000 documents
ils dépendent surtout du cache. Le nombre de documents examinés est le critère fiable.

## Index et justification

- `idx_recherche_creation` / `idx_recherche_evenement` : filtres par égalité (type, statut,
  zone, catégorie) puis champ de tri puis `_id` (départage utilisé par le service).
  Le tri est fourni par l'index, donc plus d'étape SORT en mémoire.
- `idx_tri_creation` / `idx_tri_evenement` : tri sans filtre, ou avec des filtres qui ne
  correspondent pas au début des index composés (par exemple statut seul).
  `idx_tri_evenement` sert aussi au filtre de période sur `dateEvenement`.
- `idx_texte` (existant) : recherche par mot-clé, non modifié.

## Compromis et limites

- Chaque index occupe de l'espace et ralentit légèrement les écritures. Quatre index
  restent acceptables car les déclarations sont beaucoup plus lues qu'écrites.
- Un filtre rare sans type ni statut oblige MongoDB à parcourir plus d'entrées
  (scénario 7 : 60 documents pour 10 résultats).
- La pagination par `skip` ralentit sur les pages très profondes ; une pagination par
  curseur (dernier `dateCreation` et `_id`) serait la solution à plus grande échelle.
- `total` (compteur de la pagination) est recalculé à chaque requête et coûte
  proportionnellement au nombre de résultats correspondants.
