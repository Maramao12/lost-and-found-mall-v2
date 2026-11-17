/* =====================================================================
   src/middlewares/validate.js
   ---------------------------------------------------------------------
   Middleware réutilisable : vérifie les données reçues avec un schéma Zod
   AVANT d'atteindre le contrôleur ("toutes les données reçues sont non
   fiables", cahier des charges section 10).

   EXEMPLE D'UTILISATION dans un fichier de routes :
     const { z } = require("zod");
     const validate = require("../middlewares/validate");

     const creerDeclarationSchema = z.object({
       type: z.enum(TYPE_DECLARATION),
       titre: z.string().min(3).max(120),
       description: z.string().min(5)
     });

     router.post("/", validate(creerDeclarationSchema), controller.creer);

   Après validation, req.body contient les données NETTOYÉES par Zod
   (les champs inconnus sont retirés).
   ===================================================================== */

// schema : le schéma Zod
// source : "body" (par défaut), "query" (?a=1) ou "params" (/:id)
function validate(schema, source) {
  const cible = source || "body";

  return function (req, res, next) {
    // safeParse ne lève pas d'exception : il retourne { success, data | error }
    const resultat = schema.safeParse(req[cible]);

    if (!resultat.success) {
      // On passe l'erreur Zod au gestionnaire d'erreurs (réponse 400)
      return next(resultat.error);
    }

    // On remplace par les données validées et nettoyées
    req[cible] = resultat.data;
    next();
  };
}

module.exports = validate;
