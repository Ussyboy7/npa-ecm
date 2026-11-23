"""Grade level utilities and constants shared across apps.

NPA grade hierarchy (highest to lowest):
MDCS > EDCS > GMCS > AGMCS > MSS1 > MSS2 > MSS3 > MSS4 > MSS5 >
SSS1 > SSS2 > SSS3 > SSS4 > JSS1 > JSS2 > JSS3
"""

from __future__ import annotations

from typing import Final

GRADE_ORDER: Final[tuple[str, ...]] = (
    "MDCS",
    "EDCS",
    "GMCS",
    "AGMCS",
    "MSS1",
    "MSS2",
    "MSS3",
    "MSS4",
    "MSS5",
    "SSS1",
    "SSS2",
    "SSS3",
    "SSS4",
    "JSS1",
    "JSS2",
    "JSS3",
)

# O(1) rank lookup; unknown grades rank last.
GRADE_RANK: Final[dict[str, int]] = {grade: idx for idx, grade in enumerate(GRADE_ORDER)}

# Grade levels that can access CONFIDENTIAL documents
SENSITIVITY_HIGH_CONFIDENTIAL_GRADES: frozenset[str] = frozenset(
    {"MSS5", "MSS4", "MSS3", "MSS2", "MSS1", "EDCS", "MDCS"}
)

# Grade levels that can access RESTRICTED documents
SENSITIVITY_HIGH_RESTRICTED_GRADES: frozenset[str] = frozenset(
    {"MSS1", "EDCS", "MDCS"}
)

# Directorate-level leadership grades
DIRECTORATE_GRADES: frozenset[str] = frozenset({"MDCS", "EDCS", "MD", "ED"})

# Division-level leadership grades
DIVISION_GRADES: frozenset[str] = frozenset({"MSS1", "GM", "GMCS"})

# Department-level leadership grades
DEPARTMENT_GRADES: frozenset[str] = frozenset({"MSS2", "AGM", "AGMCS"})

# Management grades (MSS1 through MSS5 plus executive directors)
MANAGEMENT_GRADES: frozenset[str] = frozenset(
    {"MSS1", "MSS2", "MSS3", "MSS4", "MSS5", "EDCS", "MDCS"}
)

# Senior management grades (MSS1 through MSS3 plus executive directors)
SENIOR_MANAGEMENT_GRADES: frozenset[str] = frozenset(
    {"MSS1", "MSS2", "MSS3", "EDCS", "MDCS"}
)

# Executive / top leadership grades
EXECUTIVE_GRADES: frozenset[str] = frozenset({"MDCS", "EDCS", "MSS1"})

# Leadership grades used for analytics/reporting
LEADERSHIP_GRADES: frozenset[str] = frozenset({"MDCS", "EDCS", "MSS1", "MSS2"})

# The tiers a grade can carry, in the order the catalogue serves them. Each one
# is derived from the constants above so the catalogue and the rules that read
# those constants can never tell different stories.
GRADE_TIERS: Final[tuple[tuple[str, frozenset[str]], ...]] = (
    ("management", MANAGEMENT_GRADES),
    ("senior_management", SENIOR_MANAGEMENT_GRADES),
    ("executive", EXECUTIVE_GRADES),
    ("leadership", LEADERSHIP_GRADES),
    ("directorate_leadership", DIRECTORATE_GRADES),
    ("division_leadership", DIVISION_GRADES),
    ("department_leadership", DEPARTMENT_GRADES),
)


def grade_catalog() -> tuple[dict[str, object], ...]:
    """The grade hierarchy plus the leadership tiers each grade carries.

    ``rank`` is the position in :data:`GRADE_ORDER`: 0 is the most senior grade.
    Consumers use it instead of keeping their own order or their own list of
    management grades. ``directorate_leadership`` includes the MD, who leads
    every directorate; callers that report the MD separately check ``rank`` 0
    first.
    """
    return tuple(
        {
            "code": grade,
            "rank": index,
            **{
                tier: grade in grades
                for tier, grades in GRADE_TIERS
            },
        }
        for index, grade in enumerate(GRADE_ORDER)
    )


def get_grade_level(grade: str | None) -> int:
    """Return the numeric rank of a grade; unknown grades rank last."""
    if not grade:
        return 999
    try:
        return GRADE_RANK.get(grade.upper(), 999)
    except AttributeError:
        return 999
