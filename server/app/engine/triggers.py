"""Trigger evaluation engine for strategy rules."""
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass


@dataclass
class TriggerResult:
    """Result of trigger evaluation."""
    triggered: bool
    side: Optional[str]
    score: float
    reasons: List[str]


def _get_indicator_value(
    indicators: Dict[str, List[Optional[float]]],
    name: str,
    offset: int = 0
) -> Optional[float]:
    """Get indicator value at offset from end (0 = latest)."""
    values = indicators.get(name, [])
    if not values:
        return None
    idx = len(values) - 1 - offset
    if idx < 0:
        return None
    return values[idx]


def _check_threshold(
    indicators: Dict[str, List[Optional[float]]],
    condition: Dict[str, Any]
) -> Tuple[bool, str]:
    """Check threshold condition (< or >)."""
    ind_name = condition.get("indicator", "")
    operator = condition.get("operator", "")
    threshold = condition.get("value")

    current = _get_indicator_value(indicators, ind_name)
    if current is None or threshold is None:
        return False, ""

    if operator == "<":
        met = current < threshold
        reason = f"{ind_name}={current:.2f} < {threshold}"
    elif operator == ">":
        met = current > threshold
        reason = f"{ind_name}={current:.2f} > {threshold}"
    else:
        return False, ""

    return met, reason if met else ""


def _check_crossover(
    indicators: Dict[str, List[Optional[float]]],
    condition: Dict[str, Any]
) -> Tuple[bool, str]:
    """Check crossover condition (crosses_above or crosses_below)."""
    ind_name = condition.get("indicator", "")
    compare_to = condition.get("compare_to", "")
    operator = condition.get("operator", "")

    curr_ind = _get_indicator_value(indicators, ind_name, 0)
    prev_ind = _get_indicator_value(indicators, ind_name, 1)
    curr_cmp = _get_indicator_value(indicators, compare_to, 0)
    prev_cmp = _get_indicator_value(indicators, compare_to, 1)

    if None in (curr_ind, prev_ind, curr_cmp, prev_cmp):
        return False, ""

    if operator == "crosses_above":
        met = prev_ind <= prev_cmp and curr_ind > curr_cmp
        reason = f"{ind_name} crossed above {compare_to}"
    elif operator == "crosses_below":
        met = prev_ind >= prev_cmp and curr_ind < curr_cmp
        reason = f"{ind_name} crossed below {compare_to}"
    else:
        return False, ""

    return met, reason if met else ""


def _evaluate_condition(
    indicators: Dict[str, List[Optional[float]]],
    condition: Dict[str, Any]
) -> Tuple[bool, str]:
    """Evaluate a single trigger condition."""
    operator = condition.get("operator", "")

    if operator in ("<", ">"):
        return _check_threshold(indicators, condition)
    elif operator in ("crosses_above", "crosses_below"):
        return _check_crossover(indicators, condition)

    return False, ""


def evaluate_triggers(
    triggers_config: Dict[str, Any],
    indicators: Dict[str, List[Optional[float]]]
) -> TriggerResult:
    """Evaluate all trigger rules against indicator values.

    Args:
        triggers_config: Config dict with 'rules' list
        indicators: Dict mapping indicator names to computed values

    Returns:
        TriggerResult with triggered status, side, score, and reasons
    """
    rules = triggers_config.get("rules", [])

    for rule in rules:
        side = rule.get("side")
        conditions = rule.get("conditions", [])
        logic = rule.get("logic", "AND")

        if not conditions:
            continue

        results: List[Tuple[bool, str]] = []
        for cond in conditions:
            met, reason = _evaluate_condition(indicators, cond)
            results.append((met, reason))

        if logic == "AND":
            all_met = all(r[0] for r in results)
            if all_met:
                reasons = [r[1] for r in results if r[1]]
                score = 1.0  # Base score, can be enhanced later
                return TriggerResult(
                    triggered=True,
                    side=side,
                    score=score,
                    reasons=reasons
                )

    return TriggerResult(triggered=False, side=None, score=0.0, reasons=[])
