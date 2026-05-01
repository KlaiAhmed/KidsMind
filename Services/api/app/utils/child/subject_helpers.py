"""Subject deduplication helper.

Pure function with no DB or settings dependency, safe to import and test
in isolation.
"""

from collections.abc import Sequence
from typing import Union

from schemas.child.child_profile_schema import (
    AccessWindowSubjectIn,
    ChildAllowedSubjectIn,
)

SubjectItem = Union[ChildAllowedSubjectIn, AccessWindowSubjectIn, dict]


def extract_unique_subjects(items: Sequence[SubjectItem]) -> list[str]:
    seen: set[str] = set()
    ordered_subjects: list[str] = []
    for item in items:
        if isinstance(item, dict):
            if "subject" not in item:
                raise ValueError("allowed_subjects item missing required 'subject' key")
            subject = item["subject"]
        else:
            subject = item.subject
        if not isinstance(subject, str) or not subject.strip():
            raise ValueError("subject must be a non-blank string")
        if subject in seen:
            continue
        seen.add(subject)
        ordered_subjects.append(subject)
    return ordered_subjects
