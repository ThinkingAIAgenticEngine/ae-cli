#!/usr/bin/env python3
"""Calculate deterministic A/B experiment sample targets and duration."""

from __future__ import annotations

import json
import math
import sys
from typing import Any


def normal_ppf(probability: float) -> float:
    """Return the inverse standard-normal CDF using Acklam's approximation."""
    if not 0.0 < probability < 1.0:
        raise ValueError("probability must be between 0 and 1")

    a = (
        -3.969683028665376e01,
        2.209460984245205e02,
        -2.759285104469687e02,
        1.383577518672690e02,
        -3.066479806614716e01,
        2.506628277459239e00,
    )
    b = (
        -5.447609879822406e01,
        1.615858368580409e02,
        -1.556989798598866e02,
        6.680131188771972e01,
        -1.328068155288572e01,
    )
    c = (
        -7.784894002430293e-03,
        -3.223964580411365e-01,
        -2.400758277161838e00,
        -2.549732539343734e00,
        4.374664141464968e00,
        2.938163982698783e00,
    )
    d = (
        7.784695709041462e-03,
        3.224671290700398e-01,
        2.445134137142996e00,
        3.754408661907416e00,
    )

    low = 0.02425
    high = 1.0 - low
    if probability < low:
        q = math.sqrt(-2.0 * math.log(probability))
        return (
            (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
            / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)
        )
    if probability <= high:
        q = probability - 0.5
        r = q * q
        return (
            (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])
            * q
            / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0)
        )
    q = math.sqrt(-2.0 * math.log(1.0 - probability))
    return -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
        / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)
    )


def require_number(params: dict[str, Any], key: str) -> float:
    value = params.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key} must be a number")
    if not math.isfinite(float(value)):
        raise ValueError(f"{key} must be finite")
    return float(value)


def optional_integer(params: dict[str, Any], key: str, default: int) -> int:
    value = params.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{key} must be an integer")
    return value


def optional_boolean(params: dict[str, Any], key: str, default: bool) -> bool:
    value = params.get(key, default)
    if not isinstance(value, bool):
        raise ValueError(f"{key} must be a boolean")
    return value


def pair_sample_proportion(
    baseline: float,
    treatment: float,
    ratio: float,
    z_alpha: float,
    z_power: float,
) -> tuple[int, int]:
    delta = abs(treatment - baseline)
    if delta == 0.0:
        raise ValueError("MDE must produce a non-zero absolute effect")
    pooled_alternative = (baseline + ratio * treatment) / (1.0 + ratio)
    first = z_alpha * math.sqrt(
        pooled_alternative * (1.0 - pooled_alternative) * (1.0 + 1.0 / ratio)
    )
    second = z_power * math.sqrt(
        baseline * (1.0 - baseline) + treatment * (1.0 - treatment) / ratio
    )
    control = math.ceil(((first + second) / delta) ** 2)
    return control, math.ceil(control * ratio)


def pair_sample_continuous(
    absolute_effect: float,
    ratio: float,
    z_alpha: float,
    z_power: float,
    control_stddev: float,
    treatment_stddev: float,
) -> tuple[int, int]:
    if absolute_effect == 0.0:
        raise ValueError("MDE must produce a non-zero absolute effect")
    control = math.ceil(
        (z_alpha + z_power) ** 2
        * (control_stddev**2 + treatment_stddev**2 / ratio)
        / absolute_effect**2
    )
    return control, math.ceil(control * ratio)


def calculate_duration(
    total_required: int,
    daily_eligible_units: float,
    experiment_traffic: float,
    min_runtime_days: int,
    align_to_full_weeks: bool,
) -> tuple[float, int, int]:
    """Return effective daily units, raw duration, and policy-adjusted duration."""
    effective_daily_units = daily_eligible_units * experiment_traffic
    nearest_integer = round(effective_daily_units)
    if math.isclose(
        effective_daily_units,
        nearest_integer,
        rel_tol=0.0,
        abs_tol=1e-9,
    ):
        effective_daily_units = float(nearest_integer)
    else:
        effective_daily_units = round(effective_daily_units, 12)
    raw_duration_days = math.ceil(total_required / effective_daily_units)
    duration_days = max(min_runtime_days, raw_duration_days)
    if align_to_full_weeks:
        duration_days = math.ceil(duration_days / 7.0) * 7
    return effective_daily_units, raw_duration_days, duration_days


def traffic_candidates(params: dict[str, Any], max_available_traffic: float) -> list[float]:
    """Return validated absolute experiment-traffic candidates."""
    raw_candidates = params.get(
        "traffic_candidates",
        [0.05, 0.10, 0.20, 0.30, 0.50, 0.70, 1.0],
    )
    if not isinstance(raw_candidates, list) or not raw_candidates:
        raise ValueError("traffic_candidates must be a non-empty list")

    candidates: list[float] = []
    for value in raw_candidates:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("every traffic candidate must be a number")
        candidate = float(value)
        if not math.isfinite(candidate) or not 0.0 < candidate <= 1.0:
            raise ValueError("every traffic candidate must be greater than 0 and at most 1")
        if candidate <= max_available_traffic + 1e-12:
            candidates.append(min(candidate, max_available_traffic))

    candidates.append(max_available_traffic)
    return sorted(set(candidates))


def calculate(params: dict[str, Any]) -> dict[str, Any]:
    metric_type = params.get("metric_type")
    if metric_type not in {"proportion", "continuous"}:
        raise ValueError("metric_type must be proportion or continuous")

    baseline = require_number(params, "baseline")
    mde = require_number(params, "mde")
    if mde <= 0.0:
        raise ValueError("mde must be greater than 0")
    mde_type = params.get("mde_type")
    if mde_type not in {"relative", "absolute"}:
        raise ValueError("mde_type must be relative or absolute")
    effect_direction = params.get("effect_direction")
    if effect_direction not in {"increase", "decrease"}:
        raise ValueError("effect_direction must be increase or decrease")

    confidence = (
        require_number(params, "confidence_level")
        if "confidence_level" in params
        else 0.95
    )
    power_source = "provided" if "power" in params else "policy_default"
    power = require_number(params, "power") if "power" in params else 0.80
    if not math.isclose(confidence, 0.95, rel_tol=0.0, abs_tol=1e-12):
        raise ValueError("current experiment reporting requires confidence_level=0.95")
    if not 0.5 < power < 1.0:
        raise ValueError("power must be between 0.5 and 1")

    allocations_value = params.get("allocations")
    if not isinstance(allocations_value, list) or len(allocations_value) < 2:
        raise ValueError("allocations must contain control and at least one treatment")
    if any(
        isinstance(value, bool) or not isinstance(value, (int, float))
        for value in allocations_value
    ):
        raise ValueError("every allocation must be a number")
    allocations = [float(value) for value in allocations_value]
    if any(not math.isfinite(value) or value <= 0.0 for value in allocations):
        raise ValueError("every allocation must be a positive finite number")
    if not math.isclose(sum(allocations), 1.0, rel_tol=0.0, abs_tol=1e-9):
        raise ValueError("allocations must sum to 1.0")

    daily_eligible_units = require_number(params, "daily_eligible_units")
    if daily_eligible_units <= 0.0:
        raise ValueError("daily_eligible_units must be greater than 0")

    min_runtime_days = optional_integer(params, "min_runtime_days", 7)
    max_runtime_days = optional_integer(params, "max_runtime_days", 60)
    align_to_full_weeks = optional_boolean(params, "align_to_full_weeks", True)
    if min_runtime_days < 1 or max_runtime_days < min_runtime_days:
        raise ValueError("runtime bounds are invalid")

    number_of_comparisons = len(allocations) - 1
    alpha = 0.05
    multiple_comparison_method = (
        "bonferroni" if number_of_comparisons > 1 else "none"
    )
    alpha_per_comparison = alpha / number_of_comparisons
    z_alpha = normal_ppf(1.0 - alpha_per_comparison / 2.0)
    z_power = normal_ppf(power)

    absolute_effect = mde if mde_type == "absolute" else abs(baseline) * mde
    signed_effect = absolute_effect if effect_direction == "increase" else -absolute_effect
    treatment_value = baseline + signed_effect
    warnings: list[str] = []

    if metric_type == "proportion":
        if not 0.0 < baseline < 1.0:
            raise ValueError("proportion baseline must be between 0 and 1")
        if not 0.0 < treatment_value < 1.0:
            raise ValueError("proportion MDE produces a treatment rate outside 0..1")
    else:
        control_stddev = require_number(params, "standard_deviation")
        treatment_stddev = (
            require_number(params, "treatment_standard_deviation")
            if "treatment_standard_deviation" in params
            else control_stddev
        )
        if control_stddev <= 0.0 or treatment_stddev <= 0.0:
            raise ValueError("continuous standard deviations must be greater than 0")

    control_allocation = allocations[0]
    pair_requirements: list[dict[str, Any]] = []
    total_scale = 0.0

    for index, treatment_allocation in enumerate(allocations[1:], start=1):
        ratio = treatment_allocation / control_allocation
        if metric_type == "proportion":
            control_required, treatment_required = pair_sample_proportion(
                baseline, treatment_value, ratio, z_alpha, z_power
            )
        else:
            control_required, treatment_required = pair_sample_continuous(
                absolute_effect,
                ratio,
                z_alpha,
                z_power,
                control_stddev,
                treatment_stddev,
            )
        pair_scale = max(
            control_required / control_allocation,
            treatment_required / treatment_allocation,
        )
        total_scale = max(total_scale, pair_scale)
        pair_requirements.append(
            {
                "treatment_index": index,
                "allocation_ratio_to_control": ratio,
                "control_required": control_required,
                "treatment_required": treatment_required,
            }
        )

    total_required = math.ceil(total_scale)
    group_targets = [math.ceil(total_required * allocation) for allocation in allocations]

    max_available_traffic: float | None = None
    if "max_available_traffic" in params:
        max_available_traffic = require_number(params, "max_available_traffic")
        if not 0.0 < max_available_traffic <= 1.0:
            raise ValueError("max_available_traffic must be greater than 0 and at most 1")

    traffic_evaluations: list[dict[str, Any]] = []
    if "experiment_traffic" in params:
        experiment_traffic = require_number(params, "experiment_traffic")
        if not 0.0 < experiment_traffic <= 1.0:
            raise ValueError("experiment_traffic must be greater than 0 and at most 1")
        if (
            max_available_traffic is not None
            and experiment_traffic > max_available_traffic + 1e-12
        ):
            raise ValueError("experiment_traffic exceeds max_available_traffic")
        traffic_selection_mode = "provided"
        effective_daily_units, raw_duration_days, duration_days = calculate_duration(
            total_required,
            daily_eligible_units,
            experiment_traffic,
            min_runtime_days,
            align_to_full_weeks,
        )
        traffic_evaluations.append(
            {
                "experiment_traffic": experiment_traffic,
                "effective_daily_units": effective_daily_units,
                "raw_duration_days": raw_duration_days,
                "recommended_duration_days": duration_days,
                "feasible_within_max_runtime": duration_days <= max_runtime_days,
            }
        )
    else:
        if max_available_traffic is None:
            raise ValueError(
                "provide experiment_traffic or max_available_traffic for traffic recommendation"
            )
        traffic_selection_mode = "recommended"
        selected: dict[str, Any] | None = None
        for candidate in traffic_candidates(params, max_available_traffic):
            effective, raw_days, adjusted_days = calculate_duration(
                total_required,
                daily_eligible_units,
                candidate,
                min_runtime_days,
                align_to_full_weeks,
            )
            evaluation = {
                "experiment_traffic": candidate,
                "effective_daily_units": effective,
                "raw_duration_days": raw_days,
                "recommended_duration_days": adjusted_days,
                "feasible_within_max_runtime": adjusted_days <= max_runtime_days,
            }
            traffic_evaluations.append(evaluation)
            if selected is None and evaluation["feasible_within_max_runtime"]:
                selected = evaluation
        if selected is None:
            selected = traffic_evaluations[-1]
        experiment_traffic = float(selected["experiment_traffic"])
        effective_daily_units = float(selected["effective_daily_units"])
        raw_duration_days = int(selected["raw_duration_days"])
        duration_days = int(selected["recommended_duration_days"])

    feasible_within_max = duration_days <= max_runtime_days
    if not feasible_within_max:
        warnings.append(
            f"Required duration ({duration_days} days) exceeds max_runtime_days ({max_runtime_days})."
        )
    if raw_duration_days < min_runtime_days:
        warnings.append(
            "The statistical target is reached before the minimum runtime; keep the full minimum period."
        )
    if number_of_comparisons > 1:
        warnings.append(
            "Planning uses Bonferroni correction, while the current native report labels significance at unadjusted p < 0.05 with a 95% confidence interval. Use alpha_per_comparison for the preregistered final decision."
        )

    return {
        "ok": True,
        "data": {
            "metric_type": metric_type,
            "baseline": baseline,
            "mde": mde,
            "mde_type": mde_type,
            "effect_direction": effect_direction,
            "absolute_effect": absolute_effect,
            "signed_effect": signed_effect,
            "treatment_value": treatment_value,
            "confidence_level": confidence,
            "power": power,
            "power_source": power_source,
            "alpha": alpha,
            "family_alpha": alpha,
            "alpha_per_comparison": alpha_per_comparison,
            "multiple_comparison_method": multiple_comparison_method,
            "number_of_treatment_comparisons": number_of_comparisons,
            "allocations": allocations,
            "group_sample_targets": group_targets,
            "total_sample_target": total_required,
            "pair_requirements": pair_requirements,
            "daily_eligible_units": daily_eligible_units,
            "experiment_traffic": experiment_traffic,
            "selected_experiment_traffic": experiment_traffic,
            "recommended_experiment_traffic": (
                experiment_traffic
                if traffic_selection_mode == "recommended" and feasible_within_max
                else None
            ),
            "traffic_selection_mode": traffic_selection_mode,
            "max_available_traffic": max_available_traffic,
            "traffic_candidates_evaluated": traffic_evaluations,
            "effective_daily_units": effective_daily_units,
            "raw_duration_days": raw_duration_days,
            "recommended_duration_days": duration_days,
            "aligned_to_full_weeks": align_to_full_weeks,
            "feasible_within_max_runtime": feasible_within_max,
            "warnings": warnings,
        },
    }


def main() -> int:
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: calculate_experiment_plan.py '<json-object>'")
        raw = sys.argv[1]
        params = json.load(sys.stdin) if raw == "-" else json.loads(raw)
        if not isinstance(params, dict):
            raise ValueError("input must be a JSON object")
        print(json.dumps(calculate(params), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, KeyError, json.JSONDecodeError) as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": {
                        "type": "validation",
                        "code": "INVALID_INPUT",
                        "message": str(error),
                    },
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
