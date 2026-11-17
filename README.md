# Lost & Found – Centre commercial

Application web permettant de déclarer des objets perdus ou trouvés dans un
centre commercial et de faciliter leur restitution.
Stack : Node.js / Express, MongoDB, React.

## Contexte


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
```

## Installation
1. `git clone <adresse du dépôt>`
2. `cd backend`
3. `npm install`
4. Copier `.env.example` en `.env`
5. Créer la base avec MongoDB Compass
6. `npm run dev`
7. Tester : http://localhost:3000/api/health

## Répartition
| Binôme | Domaine | Branche |
|---|---|---|
| 1 | Utilisateurs, déclarations, sécurité | `binome1-users-declarations` |
| 2 | Recherche et exploration | `binome2-search` |
| 3 | Matching et résolution | `binome3-matching` |
| 4 | Administration, modération, statistiques | `binome4-admin` |



## Choix techniques et justifications

