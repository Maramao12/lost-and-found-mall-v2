# Lost & Found – Centre commercial

Application web permettant de déclarer des objets perdus ou trouvés dans un
centre commercial et de faciliter leur restitution.
Stack : Node.js / Express, MongoDB, React.

## Contexte
(À compléter par l'équipe : pourquoi ce contexte, utilisateurs, catégories
d'objets, zones, règles métier, notifications, modération.)

## Structure du dépôt
```
lost-and-found-mall-v2/
├── backend/
│   ├── package.json
│   ├── .env.example          (modèle, SANS secrets)
│   └── src/
│       ├── server.js         (point d'entrée)
│       ├── app.js            (application Express)
│       ├── config/           (connexion MongoDB)
│       ├── constants/        (énumérations partagées)
│       ├── models/           (10 modèles Mongoose)
│       ├── controllers/      (logique métier : un fichier par domaine)
│       ├── routes/           (index.js + un fichier de routes par domaine)
│       ├── middlewares/      (erreurs, validation Zod, authentification)
│       └── utils/
├── frontend/                 (React)
├── database/lostfound_mongo.js   (création de la base + données de test)
├── postman/                  (collections exportées)
└── docs/                     (cahier des charges, diagramme de classes)
```

## Installation
1. `git clone <adresse du dépôt>`
2. `cd backend`
3. `npm install`
4. Copier `.env.example` en `.env` (Windows : `copy .env.example .env`)
5. Créer la base avec MongoDB Compass : ouvrir le terminal **_MONGOSH** puis
   `load("CHEMIN/COMPLET/database/lostfound_mongo.js")`
   (chemin avec des `/`). Chaque personne a sa propre base locale.
6. `npm run dev`
7. Tester : http://localhost:3000/api/health

## Répartition
| Binôme | Domaine | Branche |
|---|---|---|
| 1 | Utilisateurs, déclarations, sécurité | `binome1-users-declarations` |
| 2 | Recherche et exploration | `binome2-search` |
| 3 | Matching et résolution | `binome3-matching` |
| 4 | Administration, modération, statistiques | `binome4-admin` |

## Règles de travail avec git
- On ne pousse jamais directement sur `main`.
- Chaque binôme travaille sur sa branche et livre par Pull Request,
  relue par une personne d'un autre binôme.
- `git pull` avant de commencer ; `git merge main` au moins une fois par jour.
- Messages de commit : `feat:`, `fix:`, `docs:`, `chore:` + une phrase claire.
- Jamais de `.env` ni de `node_modules` dans git.
- Fichiers partagés (`app.js`, `package.json`, `package-lock.json`,
  `routes/index.js`, `constants/enums.js`) : modification dans une petite
  Pull Request à part, fusionnée vite, annoncée à tout le groupe.
- Après chaque `git pull` qui modifie `package.json` : `npm install`.
- Un changement de nom de champ dans la base doit être annoncé AVANT
  (modèles, script de base et diagramme doivent rester d'accord).

## Choix techniques et justifications
(À compléter par chaque binôme.)
