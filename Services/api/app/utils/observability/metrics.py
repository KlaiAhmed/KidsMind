"""Prometheus metrics for flagged-content safety flows."""

from prometheus_client import Counter


flagged_rate_total = Counter(
    "flagged_rate_total",
    "Number of chat messages flagged by moderation",
    ["stage", "category"],
)

moderation_failures_total = Counter(
    "moderation_failures_total",
    "Number of moderation provider failures",
    ["provider", "failure_kind"],
)

moderation_timeout_total = Counter(
    "moderation_timeout_total",
    "Number of moderation timeouts",
    ["provider"],
)

parent_notification_failure_total = Counter(
    "parent_notification_failure_total",
    "Number of failed parent safety notifications",
    ["notification_type"],
)