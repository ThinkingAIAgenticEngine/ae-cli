#!/usr/bin/env python3
"""Calculate deterministic SRM and treatment-versus-control comparisons."""

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


def regularized_gamma_q(shape: float, value: float) -> float:
    """Return the regularized upper incomplete gamma function Q(shape, value)."""
    if shape <= 0.0 or value < 0.0:
        raise ValueError("invalid gamma arguments")
    if value == 0.0:
        return 1.0
    epsilon = 3e-14
    minimum = 1e-300
    max_iterations = 10000
    log_gamma = math.lgamma(shape)

    if value < shape + 1.0:
        term = 1.0 / shape
        total = term
        current = shape
        for _ in range(max_iterations):
            current += 1.0
            term *= value / current
            total += term
            if abs(term) < abs(total) * epsilon:
                lower = total * math.exp(-value + shape * math.log(value) - log_gamma)
                return max(0.0, min(1.0, 1.0 - lower))
        raise ValueError("gamma series did not converge")

    b = value + 1.0 - shape
    c = 1.0 / minimum
    d = 1.0 / b
    h = d
    for iteration in range(1, max_iterations + 1):
        coefficient = -iteration * (iteration - shape)
        b += 2.0
        d = coefficient * d + b
        if abs(d) < minimum:
            d = minimum
        c = b + coefficient / c
        if abs(c) < minimum:
            c = minimum
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < epsilon:
            result = math.exp(-value + shape * math.log(value) - log_gamma) * h
            return max(0.0, min(1.0, result))
    raise ValueError("gamma continued fraction did not converge")


def beta_continued_fraction(a: float, b: float, x: float) -> float:
    max_iterations = 10000
    epsilon = 3e-14
    minimum = 1e-300
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < minimum:
        d = minimum
    d = 1.0 / d
    h = d
    for iteration in range(1, max_iterations + 1):
        even = 2 * iteration
        coefficient = iteration * (b - iteration) * x / ((qam + even) * (a + even))
        d = 1.0 + coefficient * d
        if abs(d) < minimum:
            d = minimum
        c = 1.0 + coefficient / c
        if abs(c) < minimum:
            c = minimum
        d = 1.0 / d
        h *= d * c

        coefficient = -(a + iteration) * (qab + iteration) * x / (
            (a + even) * (qap + even)
        )
        d = 1.0 + coefficient * d
        if abs(d) < minimum:
            d = minimum
        c = 1.0 + coefficient / c
        if abs(c) < minimum:
            c = minimum
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < epsilon:
            return h
    raise ValueError("beta continued fraction did not converge")


def regularized_beta(a: float, b: float, x: float) -> float:
    if a <= 0.0 or b <= 0.0 or not 0.0 <= x <= 1.0:
        raise ValueError("invalid beta arguments")
    if x == 0.0:
        return 0.0
    if x == 1.0:
        return 1.0
    front = math.exp(
        math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
        + a * math.log(x) + b * math.log(1.0 - x)
    )
    if x < (a + 1.0) / (a + b + 2.0):
        return front * beta_continued_fraction(a, b, x) / a
    return 1.0 - front * beta_continued_fraction(b, a, 1.0 - x) / b


def student_t_two_sided_p(t_value: float, degrees_freedom: float) -> float:
    x = degrees_freedom / (degrees_freedom + t_value * t_value)
    return regularized_beta(degrees_freedom / 2.0, 0.5, x)


def student_t_critical(alpha: float, degrees_freedom: float) -> float:
    low = 0.0
    high = 1.0
    while student_t_two_sided_p(high, degrees_freedom) > alpha:
        high *= 2.0
        if high > 1e6:
            raise ValueError("could not bracket t critical value")
    for _ in range(100):
        middle = (low + high) / 2.0
        if student_t_two_sided_p(middle, degrees_freedom) > alpha:
            low = middle
        else:
            high = middle
    return (low + high) / 2.0


def validate_groups(params: dict[str, Any]) -> list[dict[str, Any]]:
    groups = params.get("groups")
    if not isinstance(groups, list) or len(groups) < 2:
        raise ValueError("groups must contain at least two groups")
    names: set[str] = set()
    for group in groups:
        if not isinstance(group, dict):
            raise ValueError("every group must be an object")
        name = group.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("every group must have a non-empty name")
        if name in names:
            raise ValueError(f"duplicate group name: {name}")
        names.add(name)
    return groups


def calculate_srm(
    groups: list[dict[str, Any]],
    expected_allocations: dict[str, Any],
    alpha_srm: float,
) -> dict[str, Any]:
    names = [group["name"] for group in groups]
    if set(expected_allocations) != set(names):
        raise ValueError("expected_allocations keys must exactly match group names")
    allocations = {name: float(expected_allocations[name]) for name in names}
    if any(value <= 0.0 for value in allocations.values()):
        raise ValueError("expected allocations must be positive")
    if not math.isclose(sum(allocations.values()), 1.0, rel_tol=0.0, abs_tol=1e-9):
        raise ValueError("expected allocations must sum to 1.0")

    observed: dict[str, int] = {}
    for group in groups:
        assigned = group.get("assigned")
        if isinstance(assigned, bool) or not isinstance(assigned, int) or assigned < 0:
            raise ValueError("every group must have a non-negative integer assigned count")
        observed[group["name"]] = assigned
    total = sum(observed.values())
    if total == 0:
        raise ValueError("total assigned count must be greater than 0")

    expected = {name: total * allocations[name] for name in names}
    chi_square = sum(
        (observed[name] - expected[name]) ** 2 / expected[name] for name in names
    )
    degrees_freedom = len(names) - 1
    p_value = regularized_gamma_q(degrees_freedom / 2.0, chi_square / 2.0)
    return {
        "chi_square": chi_square,
        "degrees_freedom": degrees_freedom,
        "p_value": p_value,
        "alpha": alpha_srm,
        "srm_detected": p_value < alpha_srm,
        "observed": observed,
        "expected": expected,
    }


def binary_comparison(
    control: dict[str, Any],
    treatment: dict[str, Any],
    alpha: float,
) -> dict[str, Any]:
    n0 = int(control.get("sample_size", 0))
    n1 = int(treatment.get("sample_size", 0))
    x0 = int(control.get("successes", -1))
    x1 = int(treatment.get("successes", -1))
    if n0 <= 0 or n1 <= 0:
        raise ValueError("binary sample_size must be greater than 0")
    if not 0 <= x0 <= n0 or not 0 <= x1 <= n1:
        raise ValueError("binary successes must be between 0 and sample_size")
    p0 = x0 / n0
    p1 = x1 / n1
    difference = p1 - p0
    pooled = (x0 + x1) / (n0 + n1)
    pooled_se = math.sqrt(pooled * (1.0 - pooled) * (1.0 / n0 + 1.0 / n1))
    if pooled_se == 0.0:
        z_value = 0.0 if difference == 0.0 else math.copysign(math.inf, difference)
        p_value = 1.0 if difference == 0.0 else 0.0
    else:
        z_value = difference / pooled_se
        p_value = math.erfc(abs(z_value) / math.sqrt(2.0))
    interval_se = math.sqrt(
        p0 * (1.0 - p0) / n0 + p1 * (1.0 - p1) / n1
    )
    critical = normal_ppf(1.0 - alpha / 2.0)
    relative_lift = None if p0 == 0.0 else difference / p0
    return {
        "control_value": p0,
        "treatment_value": p1,
        "absolute_difference": difference,
        "relative_lift": relative_lift,
        "test": "two_sided_pooled_two_proportion_z",
        "statistic": z_value,
        "p_value": p_value,
        "confidence_interval_absolute": [
            difference - critical * interval_se,
            difference + critical * interval_se,
        ],
    }


def continuous_comparison(
    control: dict[str, Any],
    treatment: dict[str, Any],
    alpha: float,
) -> dict[str, Any]:
    n0 = int(control.get("sample_size", 0))
    n1 = int(treatment.get("sample_size", 0))
    mean0 = float(control.get("mean"))
    mean1 = float(treatment.get("mean"))
    sd0 = float(control.get("standard_deviation"))
    sd1 = float(treatment.get("standard_deviation"))
    if n0 < 2 or n1 < 2:
        raise ValueError("continuous sample_size must be at least 2")
    if sd0 < 0.0 or sd1 < 0.0:
        raise ValueError("standard_deviation must be non-negative")
    variance0 = sd0 * sd0 / n0
    variance1 = sd1 * sd1 / n1
    standard_error = math.sqrt(variance0 + variance1)
    difference = mean1 - mean0
    if standard_error == 0.0:
        t_value = 0.0 if difference == 0.0 else math.copysign(math.inf, difference)
        p_value = 1.0 if difference == 0.0 else 0.0
        degrees_freedom = math.inf
        critical = normal_ppf(1.0 - alpha / 2.0)
    else:
        t_value = difference / standard_error
        denominator = (
            variance0 * variance0 / (n0 - 1)
            + variance1 * variance1 / (n1 - 1)
        )
        degrees_freedom = (
            math.inf if denominator == 0.0 else (variance0 + variance1) ** 2 / denominator
        )
        if math.isinf(degrees_freedom):
            p_value = math.erfc(abs(t_value) / math.sqrt(2.0))
            critical = normal_ppf(1.0 - alpha / 2.0)
        else:
            p_value = student_t_two_sided_p(t_value, degrees_freedom)
            critical = student_t_critical(alpha, degrees_freedom)
    relative_lift = None if mean0 == 0.0 else difference / mean0
    return {
        "control_value": mean0,
        "treatment_value": mean1,
        "absolute_difference": difference,
        "relative_lift": relative_lift,
        "test": "two_sided_welch_t",
        "statistic": t_value,
        "degrees_freedom": degrees_freedom,
        "p_value": p_value,
        "confidence_interval_absolute": [
            difference - critical * standard_error,
            difference + critical * standard_error,
        ],
    }


def calculate(params: dict[str, Any]) -> dict[str, Any]:
    groups = validate_groups(params)
    metric_type = params.get("metric_type")
    if metric_type not in {"binary", "continuous"}:
        raise ValueError("metric_type must be binary or continuous")
    control_name = params.get("control")
    by_name = {group["name"]: group for group in groups}
    if control_name not in by_name:
        raise ValueError("control must match one group name")

    alpha = float(params.get("alpha", 0.05))
    alpha_srm = float(params.get("alpha_srm", 0.01))
    if not 0.0 < alpha < 0.5 or not 0.0 < alpha_srm < 0.5:
        raise ValueError("alpha and alpha_srm must be between 0 and 0.5")
    multiple_testing = params.get("multiple_testing", "bonferroni")
    if multiple_testing not in {"bonferroni", "none"}:
        raise ValueError("multiple_testing must be bonferroni or none")

    srm = None
    expected_allocations = params.get("expected_allocations")
    if expected_allocations is not None:
        if not isinstance(expected_allocations, dict):
            raise ValueError("expected_allocations must be an object")
        srm = calculate_srm(groups, expected_allocations, alpha_srm)

    control = by_name[control_name]
    comparisons: list[dict[str, Any]] = []
    number_of_comparisons = len(groups) - 1
    comparison_alpha = (
        alpha / number_of_comparisons
        if multiple_testing == "bonferroni"
        else alpha
    )
    for treatment in groups:
        if treatment["name"] == control_name:
            continue
        result = (
            binary_comparison(control, treatment, comparison_alpha)
            if metric_type == "binary"
            else continuous_comparison(control, treatment, comparison_alpha)
        )
        difference = result["absolute_difference"]
        significant = result["p_value"] < comparison_alpha
        if significant and difference > 0:
            classification = "statistically_significant_positive"
        elif significant and difference < 0:
            classification = "statistically_significant_negative"
        else:
            classification = "inconclusive_at_selected_alpha"
        result.update(
            {
                "control": control_name,
                "treatment": treatment["name"],
                "comparison_alpha": comparison_alpha,
                "statistically_significant": significant,
                "classification": classification,
            }
        )
        comparisons.append(result)

    exposure_coverage: dict[str, float] = {}
    for group in groups:
        assigned = group.get("assigned")
        sample_size = group.get("sample_size")
        if (
            isinstance(assigned, int)
            and assigned > 0
            and isinstance(sample_size, int)
            and sample_size >= 0
        ):
            exposure_coverage[group["name"]] = sample_size / assigned

    warnings: list[str] = []
    if len(comparisons) > 1 and multiple_testing == "none":
        warnings.append(
            "P-values are unadjusted across treatments; confirm that this matches the pre-registered policy."
        )
    if srm and srm["srm_detected"]:
        warnings.append(
            "SRM was detected from assignment counts; diagnose allocation before using causal comparisons."
        )

    return {
        "ok": True,
        "data": {
            "metric_type": metric_type,
            "control": control_name,
            "familywise_alpha": alpha,
            "multiple_testing": multiple_testing,
            "comparison_alpha": comparison_alpha,
            "srm": srm,
            "exposure_coverage": exposure_coverage,
            "comparisons": comparisons,
            "warnings": warnings,
        },
    }


def main() -> int:
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: analyze_experiment.py '<json-object>'")
        raw = sys.argv[1]
        params = json.load(sys.stdin) if raw == "-" else json.loads(raw)
        if not isinstance(params, dict):
            raise ValueError("input must be a JSON object")
        print(json.dumps(calculate(params), ensure_ascii=False, indent=2, allow_nan=False))
        return 0
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
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
