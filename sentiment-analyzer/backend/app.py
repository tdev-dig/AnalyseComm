"""FastAPI backend for French sentiment analysis application."""

from __future__ import annotations

import io
import logging
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline


LOGGER = logging.getLogger("sentiment_analyzer")
logging.basicConfig(level=logging.INFO)


LABEL_TRANSLATIONS = {
    "LABEL_0": "négatif",
    "LABEL_1": "neutre",
    "LABEL_2": "positif",
    "negative": "négatif",
    "neutral": "neutre",
    "positive": "positif",
}


STOPWORDS = {
    "les",
    "des",
    "une",
    "avec",
    "pour",
    "sur",
    "que",
    "qui",
    "dans",
    "est",
    "sont",
    "par",
    "vous",
    "nous",
    "elles",
    "ils",
    "mais",
    "pas",
    "plus",
    "tres",
    "très",
    "trop",
    "cette",
    "cet",
    "ces",
    "une",
    "au",
    "aux",
    "de",
    "du",
    "la",
    "le",
    "un",
    "et",
    "ne",
    "se",
    "ce",
    "ses",
    "son",
    "sa",
    "leur",
    "leurs",
    "comme",
    "toute",
    "tout",
    "tous",
    "faire",
    "etre",
    "être",
    "avoir",
    "tres",
    "tres",
}


class AnalyzePayload(BaseModel):
    """Request body for the /analyze endpoint."""

    upload_id: str = Field(..., description="Identifiant unique du fichier uploadé")
    column: str = Field(..., description="Nom de la colonne contenant le texte à analyser")


class AnalyzeResponse(BaseModel):
    results: List[Dict[str, Any]]
    summary: Dict[str, Any]


class UploadResponse(BaseModel):
    upload_id: str
    columns: List[str]
    detected_column: Optional[str]


def get_sentiment_pipeline() -> Any:
    """Initialise (ou récupère) le pipeline de sentiment."""

    model_name = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    LOGGER.info("Chargement du modèle de sentiment %s", model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    return pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)


PIPELINE = get_sentiment_pipeline()


def clean_text(value: str) -> str:
    text = re.sub(r"[\r\n]+", " ", str(value))
    text = re.sub(r"[^\w\s'’]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def detect_text_columns(df: pd.DataFrame) -> List[str]:
    candidate_columns: List[str] = []
    for column in df.columns:
        series = df[column]
        if pd.api.types.is_string_dtype(series) or series.dtype == object:
            sample = series.dropna().astype(str).head(200)
            if sample.empty:
                continue
            avg_len = sample.map(lambda x: len(x.split())).mean()
            if avg_len >= 2:
                candidate_columns.append(column)
    return candidate_columns


def choose_default_column(columns: List[str]) -> Optional[str]:
    priority_keywords = ["texte", "text", "phrase", "commentaire", "avis", "review", "description"]
    lowered = {col.lower(): col for col in columns}
    for keyword in priority_keywords:
        if keyword in lowered:
            return lowered[keyword]
    return columns[0] if columns else None


def dataframe_from_upload(file: UploadFile, raw_bytes: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(raw_bytes)
    filename = file.filename or ""
    try:
        if filename.lower().endswith(".csv") or file.content_type == "text/csv":
            df = pd.read_csv(buffer)
        elif filename.lower().endswith(".xlsx") or "excel" in (file.content_type or ""):
            df = pd.read_excel(buffer)
        else:
            try:
                df = pd.read_csv(buffer)
            except Exception as csv_error:  # pragma: no cover - fallback
                buffer.seek(0)
                df = pd.read_excel(buffer)
                LOGGER.warning("Lecture CSV impossible (%s), tentative Excel réussie", csv_error)
    except Exception as exc:  # pragma: no cover - logged for transparency
        LOGGER.exception("Erreur lors de la lecture du fichier uploadé")
        raise HTTPException(status_code=400, detail="Fichier illisible ou format non supporté") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="Le fichier ne contient aucune donnée")

    df = df.dropna(how="all")
    return df


def compute_word_cloud(results: List[Dict[str, Any]], top_n: int = 30) -> Dict[str, List[Dict[str, Any]]]:
    frequency_by_sentiment: Dict[str, Counter[str]] = {"positif": Counter(), "neutre": Counter(), "négatif": Counter()}
    for item in results:
        sentiment = item["sentiment"]
        tokens = [
            token
            for token in re.findall(r"\b[\w']+\b", item["clean_text"].lower())
            if len(token) > 2 and token not in STOPWORDS
        ]
        frequency_by_sentiment[sentiment].update(tokens)

    return {
        sentiment: [
            {"text": word, "value": count}
            for word, count in counter.most_common(top_n)
        ]
        for sentiment, counter in frequency_by_sentiment.items()
    }


def summarise_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(results)
    counts = Counter(item["sentiment"] for item in results)
    average_score = round(sum(item["score"] for item in results) / total, 4) if total else 0.0
    scores_by_sentiment: Dict[str, List[float]] = {"positif": [], "neutre": [], "négatif": []}
    for item in results:
        scores_by_sentiment[item["sentiment"]].append(item["score"])

    mean_by_sentiment = {
        sentiment: round(sum(values) / len(values), 4) if values else 0.0
        for sentiment, values in scores_by_sentiment.items()
    }

    dominant_sentiment = counts.most_common(1)[0][0] if counts else None
    distribution = {
        sentiment: {
            "count": counts.get(sentiment, 0),
            "percentage": round(counts.get(sentiment, 0) * 100 / total, 2) if total else 0.0,
        }
        for sentiment in ("positif", "neutre", "négatif")
    }

    overall_polarity = (
        mean_by_sentiment["positif"] - mean_by_sentiment["négatif"]
        if total
        else 0.0
    )

    return {
        "total_texts": total,
        "average_score": average_score,
        "dominant_sentiment": dominant_sentiment,
        "distribution": distribution,
        "mean_scores": mean_by_sentiment,
        "overall_polarity": round(overall_polarity, 4),
        "word_cloud": compute_word_cloud(results),
    }


def map_label(label: str) -> str:
    return LABEL_TRANSLATIONS.get(label, label)


def build_results(df: pd.DataFrame, column: str) -> List[Dict[str, Any]]:
    processed: List[Dict[str, Any]] = []
    for raw_text in df[column].fillna(""):
        raw_text = str(raw_text)
        cleaned = clean_text(raw_text)
        if not cleaned:
            continue
        prediction = PIPELINE(cleaned)[0]
        sentiment = map_label(prediction["label"])
        processed.append(
            {
                "text": raw_text,
                "clean_text": cleaned,
                "sentiment": sentiment,
                "score": round(float(prediction["score"]), 4),
            }
        )
    if not processed:
        raise HTTPException(status_code=400, detail="Impossible d'analyser le sentiment : aucun texte valide")
    return processed


UPLOAD_STORE: Dict[str, Dict[str, Any]] = {}


app = FastAPI(title="Analyseur de sentiments français", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """Stocke le fichier uploadé et retourne la colonne détectée."""

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Le fichier est vide")

    df = dataframe_from_upload(file, contents)
    columns = detect_text_columns(df)
    detected_column = choose_default_column(columns)
    if not detected_column:
        raise HTTPException(status_code=422, detail="Aucune colonne de texte détectée")

    upload_id = str(uuid.uuid4())
    UPLOAD_STORE[upload_id] = {
        "dataframe": df,
        "filename": file.filename,
    }
    LOGGER.info("Fichier %s stocké sous l'ID %s", file.filename, upload_id)

    return UploadResponse(upload_id=upload_id, columns=columns, detected_column=detected_column)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzePayload = Body(...)) -> AnalyzeResponse:
    """Analyse le sentiment de la colonne sélectionnée."""

    entry = UPLOAD_STORE.get(payload.upload_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Upload introuvable, veuillez renvoyer le fichier")

    df: pd.DataFrame = entry["dataframe"]
    if payload.column not in df.columns:
        raise HTTPException(status_code=400, detail="Colonne sélectionnée invalide")

    results = build_results(df, payload.column)
    summary = summarise_results(results)
    entry["results"] = results
    entry["summary"] = summary

    return AnalyzeResponse(results=results, summary=summary)


@app.get("/results/{upload_id}/csv")
async def download_results_csv(upload_id: str):
    entry = UPLOAD_STORE.get(upload_id)
    if not entry or "results" not in entry:
        raise HTTPException(status_code=404, detail="Résultats introuvables. Lancez l'analyse au préalable.")

    df = pd.DataFrame(entry["results"])
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    csv_bytes = buffer.getvalue().encode("utf-8")
    filename = entry.get("filename") or "resultats_sentiment.csv"
    download_name = f"resultats_{Path(filename).stem}.csv" if filename else "resultats_sentiment.csv"

    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={download_name}",
        },
    )


@app.get("/health")
async def healthcheck() -> JSONResponse:
    return JSONResponse(content={"status": "ok"})
