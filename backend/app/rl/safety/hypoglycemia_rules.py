"""
hypoglycemia_rules.py — Hard safety rules applied on top of CQL output.
Mirrors the MDP reward function's danger zones.
"""
from __future__ import annotations
from typing import List, Tuple
import numpy as np

HYPO_THRESHOLD        = 70.0
SAFE_LOW_BOUND        = 110.0
TARGET_LOW            = 140.0
TARGET_HIGH           = 180.0
SEVERE_HYPER          = 250.0


def apply_safety_rules(
    action: int,
    glucose: float,
    q_values: np.ndarray,
) -> Tuple[int, List[str], bool]:
    """
    Returns (safe_action, warnings, was_adjusted).
    Hard overrides based on clinical safety thresholds from MDP.
    """
    warnings: List[str] = []
    adjusted = False

    # 1. Never give insulin when glucose is hypoglycemic
    if glucose < HYPO_THRESHOLD and action > 0:
        warnings.append(
            f"Hypoglycemia detected ({glucose:.0f} mg/dL) — insulin overridden to No Dose."
        )
        action = 0
        adjusted = True

    # 2. Reduce dose when glucose is near-low (< 110 mg/dL)
    elif glucose < SAFE_LOW_BOUND and action > 1:
        warnings.append(
            f"Low glucose ({glucose:.0f} mg/dL < 110) — dose reduced to Low tier."
        )
        action = 1
        adjusted = True

    # 3. Warn if high dose with normal glucose (overshoot risk)
    elif action >= 4 and glucose < TARGET_HIGH:
        warnings.append(
            f"High dose (action {action}) selected with glucose {glucose:.0f} mg/dL — risk of overshoot."
        )
        # Reduce one tier
        action = action - 1
        adjusted = True

    # 4. Warn (no override) if no dose with hyperglycemia
    if glucose > SEVERE_HYPER and action == 0:
        warnings.append(
            f"Severe hyperglycemia ({glucose:.0f} mg/dL) with No Dose — please review."
        )

    return action, warnings, adjusted
