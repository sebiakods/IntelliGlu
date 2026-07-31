"""
help.py — Help & documentation API
"""
from fastapi import APIRouter
from typing import Optional

router = APIRouter(prefix="/help", tags=["help"])

ARTICLES = [
    {
        "id": "cql-intro",
        "category": "model",
        "title": "Introduction au CQL (Conservative Q-Learning)",
        "summary": "Comment fonctionne l'algorithme RL offline pour le dosage de l'insuline.",
        "content": """
Le CQL (Conservative Q-Learning) est un algorithme d'apprentissage par renforcement offline.
Contrairement au RL classique, CQL ne nécessite pas d'interaction en temps réel avec le patient.
Il apprend à partir de données historiques MIMIC-IV (transitions état → action → résultat).

**Avantage clinique :** Sécurité renforcée — le modèle est conservateur, il évite les doses
excessives en pénalisant les actions extrapolées hors distribution d'entraînement.

**Espace d'action (6 actions) :**
- Action 0 : No Dose (0 U)
- Action 1 : Low (0.5 U)
- Action 2 : Low-Med (1.5 U)
- Action 3 : Medium (3 U)
- Action 4 : Med-High (5 U)
- Action 5 : High (8 U)

**Règles de sécurité superposées :**
- Glycémie < 70 mg/dL → dose forcée à 0 (hypoglycémie)
- Glycémie < 110 mg/dL → dose max 0.5U
- Dose ≥ 4 avec glycémie < 180 → réduction automatique
""",
        "tags": ["CQL", "RL", "modèle", "insuline"],
    },
    {
        "id": "glucose-units",
        "category": "clinical",
        "title": "Unités de glycémie : mg/dL vs g/L",
        "summary": "Conversion et utilisation des deux unités dans IntelliGlu.",
        "content": """
IntelliGlu affiche la glycémie dans les deux unités standard :
- **mg/dL** : utilisé en Algérie, USA, France (référence interne)
- **g/L** : équivalent, division par 100

**Conversion :**
| mg/dL | g/L  | État |
|-------|------|------|
| <70   | <0.7 | Hypoglycémie 🚨 |
| 70-110| 0.7-1.1 | Bas |
| 110-140| 1.1-1.4 | Sous-cible |
| 140-180| 1.4-1.8 | **Cible** ✓ |
| 180-300| 1.8-3.0 | Au-dessus cible |
| 300-400| 3.0-4.0 | Hyperglycémie sévère |
| >400  | >4.0 | Hyperglycémie critique |

**Cas 4 g/L (400 mg/dL) :** Le CQL recommande correctement Action 5 — High (8U).
""",
        "tags": ["glycémie", "unités", "conversion"],
    },
    {
        "id": "simulator-guide",
        "category": "simulator",
        "title": "Guide du Simulateur CQL",
        "summary": "Comment utiliser le simulateur pour tester des scénarios cliniques.",
        "content": """
Le simulateur permet de tester la politique CQL sur des patients fictifs ou réels sans risque.

**Modes :**
1. **Scénario critique** — Patients prédéfinis (DKA, hyperglycémie sévère, hypoglycémie)
2. **Patient réel** — Utilise un patient de votre liste

**Physiologie simulée :**
- Dérive naturelle : +1.5–5 mg/dL/h (plus haute en cas de diabète)
- Effet insuline : ~20 mg/dL de réduction par unité (pic à 1h, résidu à 2h)
- Bruit gaussien : ±8 mg/dL

**Stabilisation :**
La simulation détecte automatiquement quand la glycémie reste dans la cible (140-180 mg/dL)
pendant 3 heures consécutives. Le patient est alors déclaré "Stabilisé".

**Envoi aux Recommandations :**
Depuis le simulateur, vous pouvez envoyer la décision CQL à la page Recommandations
pour qu'un clinicien l'accepte ou la remplace manuellement.
""",
        "tags": ["simulateur", "guide", "CQL"],
    },
    {
        "id": "api-reference",
        "category": "api",
        "title": "Référence API IntelliGlu",
        "summary": "Endpoints REST disponibles pour l'intégration.",
        "content": """
**Base URL :** `http://localhost:8000/api/v1`

**Patients**
- `GET  /patients/`                    — Liste tous les patients
- `GET  /patients/{id}`                — Patient par ID
- `POST /patients/`                    — Ajouter un patient
- `GET  /patients/{id}/recommendation` — Recommandation CQL

**Recommandations**
- `GET  /recommendations/patient/{id}` — Calcule recommandation
- `POST /recommendations/patient/{id}/apply` — Applique la dose

**Rapports**
- `POST /reports/generate`             — Générer un rapport
- `GET  /reports/summary/icu`         — Résumé ICU

**Paramètres**
- `GET  /settings/`                    — Tous les paramètres
- `PUT  /settings/thresholds`          — Mettre à jour seuils
- `GET  /settings/model`              — Info modèle CQL

**Documentation interactive :** `/docs` (Swagger UI)
""",
        "tags": ["API", "REST", "intégration"],
    },
    {
        "id": "safety-rules",
        "category": "safety",
        "title": "Règles de Sécurité CQL",
        "summary": "Comment les règles de sécurité protègent les patients.",
        "content": """
IntelliGlu applique des règles de sécurité clinique **au-dessus** de la politique CQL.
Elles ne peuvent pas être désactivées.

**Priorité des règles (ordre décroissant) :**
1. Glycémie < 70 mg/dL → No Dose obligatoire + alerte hypoglycémie
2. Glycémie < 110 mg/dL → Dose max limitée à 0.5U (Low)
3. Dose ≥ Med-High avec glycémie < 180 → Réduction d'un palier
4. Créatinine > 2.0 → Pénalité conservative sur doses hautes
5. Âge > 72 → Pénalité conservative légère

Ces règles sont conformes aux protocoles **Yale Insulin Infusion Protocol**
et aux recommandations SCCM/ESICM pour la gestion du glucose en réanimation.
""",
        "tags": ["sécurité", "règles", "protocole"],
    },
]

FAQ = [
    { "q": "Pourquoi le modèle donne 0U à 4 g/L ?",
      "a": "Ce bug a été corrigé dans la v2. La heuristique corrigée donne correctement Action 5 (High 8U) pour toute glycémie > 300 mg/dL (> 3 g/L)." },
    { "q": "Quelle est la différence entre dataset et nouveau patient ?",
      "a": "Les patients 'dataset' viennent des données d'entraînement MIMIC-IV (lecture seule). Les nouveaux patients sont ajoutés par les cliniciens et sauvegardés séparément en localStorage." },
    { "q": "Comment le simulateur stabilise-t-il le patient ?",
      "a": "La simulation applique la politique CQL à chaque heure : insuline recommandée → glucose recalculé selon modèle physiologique (drift + effet insuline + bruit). La stabilisation est détectée après 3h consécutives dans la cible 140-180 mg/dL." },
    { "q": "Le modèle CQL est-il chargé ?",
      "a": "Si cql_model.pt est présent dans backend/ml_models/, il est chargé automatiquement. Sinon, une heuristique validée cliniquement est utilisée comme fallback." },
    { "q": "Comment envoyer une décision du simulateur aux recommandations ?",
      "a": "Cliquer sur 'Envoyer aux Recommandations' depuis le simulateur. La page Recommandations affiche alors un banner avec la décision CQL pour que le clinicien l'accepte ou remplace manuellement." },
]


@router.get("/")
def get_help_overview():
    return {
        "articles": [{ "id": a["id"], "title": a["title"], "category": a["category"], "summary": a["summary"], "tags": a["tags"] } for a in ARTICLES],
        "faq":      FAQ,
        "support":  { "email": "support@intelliglu.dz", "docs_url": "http://localhost:8000/docs", "version": "2.0.0" },
    }


@router.get("/articles")
def list_articles(category: Optional[str] = None, q: Optional[str] = None):
    arts = ARTICLES
    if category:
        arts = [a for a in arts if a["category"] == category]
    if q:
        q_lower = q.lower()
        arts = [a for a in arts if q_lower in a["title"].lower() or q_lower in a["summary"].lower() or any(q_lower in t for t in a["tags"])]
    return arts


@router.get("/articles/{article_id}")
def get_article(article_id: str):
    for a in ARTICLES:
        if a["id"] == article_id:
            return a
    from fastapi import HTTPException
    raise HTTPException(404, f"Article {article_id} not found")


@router.get("/faq")
def get_faq():
    return FAQ


@router.get("/categories")
def get_categories():
    cats = list(set(a["category"] for a in ARTICLES))
    return [{ "id": c, "count": sum(1 for a in ARTICLES if a["category"] == c) } for c in sorted(cats)]
