"""Grade level utilities and constants shared across apps.

NPA grade hierarchy (highest to lowest), with the served level number:

MDCS (19) > EDCS (18) > MSS1 (17) > MSS2 (16) > MSS3 (15) > MSS4 (14) >
MSS5 (13) > SSS1 (12) > SSS2 (10) > SSS3 (9) > SSS4 (8) > JSS1 (6) >
JSS2 (5) > JSS3 (4)

The Managing Director and Executive Directors are executive management; the
General Manager (MSS1) and Assistant General Manager (MSS2) are senior
management; Assistant Manager (SSS1) through Principal Manager (MSS3) are
management; Officer II through Senior Officer are officers; and Staff III
through Staff I are staff.
"""

from __future__ import annotations

from typing import Final

GRADE_ORDER: Final[tuple[str, ...]] = (
    "MDCS",
    "EDCS",
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

# Retired codes that still appear in older nominal-roll workbooks.
RETIRED_GRADE_CODES: Final[dict[str, str]] = {
    "GMCS": "MSS1",
    "AGMCS": "MSS2",
}

# Grade levels that can access CONFIDENTIAL documents
SENSITIVITY_HIGH_CONFIDENTIAL_GRADES: frozenset[str] = frozenset(
    {"MSS5", "MSS4", "MSS3", "MSS2", "MSS1", "EDCS", "MDCS"}
)

# Grade levels that can access RESTRICTED documents
SENSITIVITY_HIGH_RESTRICTED_GRADES: frozenset[str] = frozenset(
    {"MSS1", "EDCS", "MDCS"}
)

# Directorate-level leadership: the MD and the Executive Directors.
DIRECTORATE_GRADES: frozenset[str] = frozenset({"MDCS", "EDCS", "MD", "ED"})

# Division-level leadership: the General Manager.
DIVISION_GRADES: frozenset[str] = frozenset({"MSS1", "GM"})

# Department-level leadership: the Assistant General Manager.
DEPARTMENT_GRADES: frozenset[str] = frozenset({"MSS2", "AGM"})

# Management and above: Assistant Manager (SSS1) upward.
MANAGEMENT_GRADES: frozenset[str] = frozenset(
    {"SSS1", "MSS5", "MSS4", "MSS3", "MSS2", "MSS1", "EDCS", "MDCS"}
)

# Senior management and above: the General Manager / Assistant General Manager
# band, plus executive management.
SENIOR_MANAGEMENT_GRADES: frozenset[str] = frozenset(
    {"MSS1", "MSS2", "EDCS", "MDCS"}
)

# Executive management: the MD and the Executive Directors.
EXECUTIVE_GRADES: frozenset[str] = frozenset({"MDCS", "EDCS"})

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


def canonical_grade_code(grade: str | None) -> str:
    """Return the stored form of a grade, mapping retired codes forward."""
    code = (grade or "").strip().upper()
    return RETIRED_GRADE_CODES.get(code, code)


def grade_is_management(grade: str | None) -> bool:
    """Whether a grade (including a retired code) is in the management band."""
    return canonical_grade_code(grade) in MANAGEMENT_GRADES


def get_grade_level(grade: str | None) -> int:
    """Return the numeric rank of a grade; unknown grades rank last."""
    if not grade:
        return 999
    try:
        return GRADE_RANK.get(grade.upper(), 999)
    except AttributeError:
        return 999
