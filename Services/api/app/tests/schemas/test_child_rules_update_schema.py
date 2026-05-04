import pytest
from pydantic import ValidationError

from schemas.child.child_profile_schema import ChildRulesUpdate


def test_child_rules_update_rejects_nested_rules_wrapper() -> None:
    with pytest.raises(ValidationError):
        ChildRulesUpdate.model_validate(
            {
                "rules": {"voice_mode_enabled": False},
            }
        )


def test_child_rules_update_accepts_flat_payload() -> None:
    model = ChildRulesUpdate.model_validate(
        {
            "voice_mode_enabled": False,
            "audio_storage_enabled": True,
            "allowed_subjects": [{"subject": "math"}],
        }
    )

    assert model.voice_mode_enabled is False
    assert model.audio_storage_enabled is True
    assert model.allowed_subjects is not None
    assert model.allowed_subjects[0].subject == "math"
