"""Tests for trigger evaluation engine."""
import pytest
from app.engine.triggers import evaluate_triggers, TriggerResult


class TestThresholdTriggers:
    def test_rsi_below_threshold(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {"rsi_14": [None, None, 25.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "long"
        assert "rsi_14=25.00 < 30" in result.reasons[0]

    def test_rsi_above_threshold(self):
        triggers = {
            "rules": [
                {
                    "side": "short",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": ">", "value": 70}
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {"rsi_14": [None, None, 75.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "short"

    def test_threshold_not_met(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {"rsi_14": [None, None, 50.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is False
        assert result.side is None


class TestCrossoverTriggers:
    def test_ema_crosses_above(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {
                            "indicator": "fast_ema",
                            "operator": "crosses_above",
                            "compare_to": "slow_ema",
                        }
                    ],
                    "logic": "AND",
                }
            ]
        }
        # Fast EMA goes from below to above slow EMA
        indicators = {
            "fast_ema": [9.0, 11.0],
            "slow_ema": [10.0, 10.0],
        }

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "long"
        assert "crossed above" in result.reasons[0]

    def test_ema_crosses_below(self):
        triggers = {
            "rules": [
                {
                    "side": "short",
                    "conditions": [
                        {
                            "indicator": "fast_ema",
                            "operator": "crosses_below",
                            "compare_to": "slow_ema",
                        }
                    ],
                    "logic": "AND",
                }
            ]
        }
        # Fast EMA goes from above to below slow EMA
        indicators = {
            "fast_ema": [11.0, 9.0],
            "slow_ema": [10.0, 10.0],
        }

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "short"

    def test_no_crossover(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {
                            "indicator": "fast_ema",
                            "operator": "crosses_above",
                            "compare_to": "slow_ema",
                        }
                    ],
                    "logic": "AND",
                }
            ]
        }
        # Fast EMA stays above slow EMA (no crossover)
        indicators = {
            "fast_ema": [11.0, 12.0],
            "slow_ema": [10.0, 10.0],
        }

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is False


class TestANDLogic:
    def test_all_conditions_met(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30},
                        {
                            "indicator": "fast_ema",
                            "operator": "crosses_above",
                            "compare_to": "slow_ema",
                        },
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {
            "rsi_14": [None, 25.0],
            "fast_ema": [9.0, 11.0],
            "slow_ema": [10.0, 10.0],
        }

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "long"
        assert len(result.reasons) == 2

    def test_partial_conditions_met(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30},
                        {
                            "indicator": "fast_ema",
                            "operator": "crosses_above",
                            "compare_to": "slow_ema",
                        },
                    ],
                    "logic": "AND",
                }
            ]
        }
        # RSI condition met, but no crossover
        indicators = {
            "rsi_14": [None, 25.0],
            "fast_ema": [11.0, 12.0],
            "slow_ema": [10.0, 10.0],
        }

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is False


class TestMultipleRules:
    def test_first_matching_rule_wins(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                },
                {
                    "side": "short",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": ">", "value": 70}
                    ],
                    "logic": "AND",
                },
            ]
        }
        indicators = {"rsi_14": [None, 25.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is True
        assert result.side == "long"

    def test_no_rules_match(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {"rsi_14": [None, 50.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is False
        assert result.side is None
        assert result.reasons == []


class TestEdgeCases:
    def test_missing_indicator(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "nonexistent", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                }
            ]
        }
        indicators = {"rsi_14": [None, 25.0]}

        result = evaluate_triggers(triggers, indicators)

        assert result.triggered is False

    def test_empty_rules(self):
        result = evaluate_triggers({"rules": []}, {"rsi_14": [50.0]})
        assert result.triggered is False

    def test_empty_indicators(self):
        triggers = {
            "rules": [
                {
                    "side": "long",
                    "conditions": [
                        {"indicator": "rsi_14", "operator": "<", "value": 30}
                    ],
                    "logic": "AND",
                }
            ]
        }
        result = evaluate_triggers(triggers, {})
        assert result.triggered is False
