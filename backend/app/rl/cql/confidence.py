"""confidence.py — Compute softmax-based confidence from Q-values."""
import numpy as np

def compute_confidence(q_values: np.ndarray, action: int) -> float:
    q_shifted = q_values - q_values.max()
    probs = np.exp(q_shifted) / np.exp(q_shifted).sum()
    return float(probs[action])
