"""Shared, lossless tracking-plan enum normalization (no I/O or SDK calls)."""

VALID_PROP_TYPES = frozenset({"文本", "数值", "布尔", "时间", "对象", "对象组", "列表"})

_TYPE_ALIASES = {
    **{value: value for value in VALID_PROP_TYPES},
    "字符串": "文本",
    "text": "文本",
    "string": "文本",
    "number": "数值",
    "boolean": "布尔",
    "bool": "布尔",
    "datetime": "时间",
    "date": "时间",
    "time": "时间",
    "object": "对象",
    "row": "对象",
    "object_group": "对象组",
    "object group": "对象组",
    "array_row": "对象组",
    "array row": "对象组",
    "object[]": "对象组",
    "object array": "对象组",
    "object_array": "对象组",
    "list": "列表",
    "array_string": "列表",
    "string[]": "列表",
    "string array": "列表",
    "string_array": "列表",
}

# Plan declaration enums are narrower than SDK operations. In particular,
# deletion/unset/unique-append SDK APIs are NOT valid plan update methods.
CANONICAL_UPDATE_METHODS = frozenset({"user_set", "user_setOnce", "user_add", "user_append"})
LEGACY_UPDATE_METHODS = frozenset({"上报时", "登录时", "仅首次"})
VALID_UPDATE_METHODS = CANONICAL_UPDATE_METHODS | LEGACY_UPDATE_METHODS


def normalize_property_type(value) -> str:
    """Return one of the seven Chinese types; English aliases ignore case.

    Whitespace is trimmed. Object and object-group semantics remain distinct.
    Blank, non-string and unknown values raise ValueError rather than guessing.
    """
    if isinstance(value, str):
        canonical = _TYPE_ALIASES.get(value.strip().casefold())
        if canonical is not None:
            return canonical
    raise ValueError(f"Unknown property type: {value!r}")


def normalize_update_method(value) -> str:
    """Preserve a supported API operation or legacy timing, trimming whitespace.

    API spelling is case-sensitive; unknown/blank/non-string values raise
    ValueError. No API operation is translated into a legacy timing label.
    """
    if isinstance(value, str) and value.strip() in VALID_UPDATE_METHODS:
        return value.strip()
    raise ValueError(f"Unknown update method: {value!r}")
