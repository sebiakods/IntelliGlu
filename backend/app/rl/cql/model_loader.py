"""
model_loader.py — Load the trained CQL model (cql_model.pt)
FIX: state_dim=26 (not 25) to match actual training features.
"""
from __future__ import annotations
import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class MLP(nn.Module):
    def __init__(self, in_dim, out_dim, hidden=(512, 512, 512, 256),
                 layernorm=True, dropout=0.05):
        super().__init__()
        layers = []
        prev = in_dim
        for h in hidden:
            layers.append(nn.Linear(prev, h))
            if layernorm:
                layers.append(nn.LayerNorm(h))
            layers.append(nn.ReLU())
            if dropout > 0:
                layers.append(nn.Dropout(dropout))
            prev = h
        layers.append(nn.Linear(prev, out_dim))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class DiscreteQNetwork(nn.Module):
    def __init__(self, state_dim, n_actions, hidden=(512, 512, 512, 256),
                 layernorm=True, dropout=0.05):
        super().__init__()
        self.q = MLP(state_dim, n_actions, hidden=hidden,
                     layernorm=layernorm, dropout=dropout)

    def forward(self, state):
        return self.q(state)


class CQLInferenceModel:
    """Thin wrapper around loaded Q-networks for inference only."""

    def __init__(self, state_dim: int = 26, n_actions: int = 6,
                 hidden: Tuple = (512, 512, 512, 256), device: str = "cpu"):
        self.state_dim = state_dim
        self.n_actions = n_actions
        self.device = torch.device(device)
        self._loaded = False
        self._hidden = hidden
        self.q1 = None
        self.q2 = None

    def _build_networks(self, state_dim: int) -> None:
        self.q1 = DiscreteQNetwork(state_dim, self.n_actions, self._hidden).to(self.device)
        self.q2 = DiscreteQNetwork(state_dim, self.n_actions, self._hidden).to(self.device)

    def load(self, path: str | Path) -> None:
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"CQL model not found: {path}")

        ckpt = torch.load(path, map_location=self.device, weights_only=True)

        # Auto-detect state_dim from checkpoint weights
        q1_state = ckpt.get("q1", {})
        first_key = next((k for k in q1_state if "weight" in k), None)
        if first_key:
            detected_dim = q1_state[first_key].shape[1]
            if detected_dim != self.state_dim:
                logger.info(f"Auto-detected state_dim={detected_dim} from checkpoint (was {self.state_dim})")
                self.state_dim = detected_dim

        self._build_networks(self.state_dim)
        self.q1.load_state_dict(ckpt["q1"])
        self.q2.load_state_dict(ckpt["q2"])
        self.q1.eval()
        self.q2.eval()
        self._loaded = True
        logger.info(f"CQL model loaded from {path} (state_dim={self.state_dim})")

    @torch.no_grad()
    def get_q_values(self, state: np.ndarray) -> np.ndarray:
        """Return Q-values for all actions given a state vector."""
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call .load() first.")
        s = torch.as_tensor(state, dtype=torch.float32, device=self.device)
        if s.ndim == 1:
            s = s.unsqueeze(0)
        # Pad or truncate state to match model's expected dim
        if s.shape[1] != self.state_dim:
            if s.shape[1] < self.state_dim:
                pad = torch.zeros(s.shape[0], self.state_dim - s.shape[1], device=self.device)
                s = torch.cat([s, pad], dim=1)
            else:
                s = s[:, :self.state_dim]
        q = torch.min(self.q1(s), self.q2(s))
        return q.squeeze(0).cpu().numpy()

    @torch.no_grad()
    def select_action(self, state: np.ndarray) -> int:
        qvals = self.get_q_values(state)
        return int(np.argmax(qvals))


# ─── Singleton ────────────────────────────────────────────────────────────────
_model: Optional[CQLInferenceModel] = None


def get_cql_model(model_path: Optional[str] = None,
                  state_dim: int = 26,
                  n_actions: int = 6) -> CQLInferenceModel:
    """Return cached singleton; loads on first call."""
    global _model
    if _model is None or not _model._loaded:
        _model = CQLInferenceModel(state_dim=state_dim, n_actions=n_actions)
        if model_path is None:
            here = Path(__file__).resolve().parent.parent.parent
            model_path = here / "ml_models" / "cql_model.pt"
        try:
            _model.load(model_path)
        except Exception as e:
            logger.error(f"Failed to load CQL model: {e}. Will use heuristic fallback.")
    return _model
