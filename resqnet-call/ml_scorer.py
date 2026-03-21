"""
ml_scorer.py — Local ML model scoring for emergency classification and priority.

Loads pre-trained scikit-learn classifiers (category_model.pkl, priority_model.pkl)
and scores transcripts to produce credible priority/category predictions with
confidence values, replacing Gemini's unreliable scoring.
"""

import pickle
from pathlib import Path

base_dir = Path(__file__).resolve().parent

with (base_dir / "category_model.pkl").open("rb") as f:
    category_model = pickle.load(f)
with (base_dir / "priority_model.pkl").open("rb") as f:
    priority_model = pickle.load(f)

# Map Gemini emergency_type labels → ML model's training labels
GEMINI_TO_ML = {
    "medical": "medical",
    "fire": "fire",
    "accident": "accident",
    "crime": "other",
    "missing_person": "other",
    "other": "other",
}


def score_with_ml(transcript: str, gemini_category: str) -> dict:
    """
    Run the local ML models on the transcript text.

    Args:
        transcript: The combined emergency transcript text.
        gemini_category: Gemini's guess at the emergency type (used for
                         cross-referencing to boost/reduce confidence).

    Returns:
        dict with keys:
            ml_category       – ML model's predicted category label
            ml_priority       – ML model's predicted priority label
            confidence         – float, cross-referenced confidence score
            category_probability – dict of {label: probability}
            priority_probability – dict of {label: probability}
    """
    category_probs = list(category_model.predict_proba([transcript])[0])
    priority_probs = list(priority_model.predict_proba([transcript])[0])

    ml_category = category_model.classes_[
        max(range(len(category_probs)), key=category_probs.__getitem__)
    ]
    ml_priority = priority_model.classes_[
        max(range(len(priority_probs)), key=priority_probs.__getitem__)
    ]
    confidence = max(category_probs)

    # Cross-reference Gemini's category with the ML prediction to adjust confidence
    mapped_category = GEMINI_TO_ML.get(gemini_category, "other")
    short_text = len(transcript) < 50

    if ml_category == mapped_category:
        # Both agree → boost confidence
        confidence = min(0.85, confidence * 1.15) if short_text else min(0.99, confidence * 1.10)
    else:
        # Disagreement → reduce confidence
        confidence = min(0.75, confidence * 0.90) if short_text else confidence * 0.85

    return {
        "confidence": round(float(confidence), 4),
        "ml_category": str(ml_category),
        "ml_priority": str(ml_priority),
        "category_probability": {
            str(label): round(float(prob), 4)
            for label, prob in zip(category_model.classes_, category_probs)
        },
        "priority_probability": {
            str(label): round(float(prob), 4)
            for label, prob in zip(priority_model.classes_, priority_probs)
        },
    }
