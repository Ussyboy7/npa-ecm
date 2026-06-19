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


def get_grade_level(grade: str | None) -> int:
    """Return the numeric rank of a grade; unknown grades rank last."""
    if not grade:
        return 999
    try:
        return GRADE_RANK.get(grade.upper(), 999)
    except AttributeError:
        return 999
