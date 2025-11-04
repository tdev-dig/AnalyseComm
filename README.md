# Sentiment Analyzer (Français)

Application web complète permettant d'analyser le sentiment de textes français à partir d'un fichier CSV ou Excel. Elle se compose d'un backend FastAPI chargé du prétraitement et de l'inférence, et d'un frontend React (Vite + TailwindCSS) pour l'expérience utilisateur.

## Structure du projet

```
sentiment-analyzer/
├── backend/                # API FastAPI (upload, analyse, export CSV)
├── frontend/               # Interface React + TailwindCSS
└── sample_data.csv         # Exemple de fichier pour tests rapides
```

## Prérequis

- Python 3.10+
- Node.js 18+

> **Remarque** : Le modèle `cardiffnlp/twitter-xlm-roberta-base-sentiment` s'appuie sur PyTorch. Préparez un environnement capable d'installer les dépendances `torch` et `transformers`.

## Installation & lancement

### Backend (FastAPI)

```bash
cd sentiment-analyzer/backend
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\activate sous Windows
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Endpoints principaux :

- `POST /upload` : téléversement du fichier, détection automatique de colonne texte
- `POST /analyze` : analyse du sentiment pour la colonne sélectionnée
- `GET /results/{upload_id}/csv` : export CSV des résultats
- `GET /health` : vérification de l'état du service

### Frontend (React + TailwindCSS)

```bash
cd sentiment-analyzer/frontend
npm install
npm run dev -- --host
```

Par défaut, le frontend attend le backend sur `http://localhost:8000`. Pour modifier la cible, définir `VITE_API_BASE_URL` dans un fichier `.env` placé à la racine de `frontend/`.

```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
```

## Utilisation

1. Téléversez un fichier `.csv` ou `.xlsx` contenant au moins une colonne de texte.
2. Choisissez (ou confirmez) la colonne à analyser.
3. Lancez l'analyse : tableau détaillé, statistiques globales, graphique en secteurs et nuage de mots seront générés.
4. Filtrez les résultats par sentiment, recherchez un texte précis, et téléchargez le rapport CSV.

Pour validation rapide, utilisez l'échantillon `sample_data.csv` fourni à la racine du projet.

## Tests & validation

- Vérifiez la santé du backend via `curl http://localhost:8000/health`.
- Lancez `npm run dev` et importez `sample_data.csv` pour observer les scores attendus.
- Les résultats téléchargés sont sauvegardés sous la forme `resultats_<nom-du-fichier>.csv`.

## Points d'amélioration

- Gestion persistante des uploads (stockage en base / cache distribué).
- Authentification des utilisateurs et historisation des analyses.
- Déploiement conteneurisé (Docker) pour faciliter la mise en production.