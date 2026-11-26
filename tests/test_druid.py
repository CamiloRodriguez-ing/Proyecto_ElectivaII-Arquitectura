from unittest.mock import MagicMock

import pytest

from shared.adapters.druid import cube_rows, summary_for_tenant
from shared.domain.errors import DomainError


def test_summary_scopes_every_query_to_authenticated_tenant():
    client = MagicMock()
    client.execute.side_effect = [
        [{"total": 2, "approved": 1, "rejected": 1, "changes_requested": 0, "average_resolution_hours": 3.5}],
        [{"status": "APPROVED", "request_count": 1}, {"status": "REJECTED", "request_count": 1}],
        [{"request_type": "CREDIT_TRANSFER", "request_count": 2}],
    ]

    result = summary_for_tenant("sistemas", client)

    assert result["approval_percentage"] == 50.0
    assert result["average_resolution_hours"] == 3.5
    assert len(client.execute.call_args_list) == 3
    for call in client.execute.call_args_list:
        sql, parameters = call.args
        assert "tenant_id = ?" in sql
        assert parameters == [{"type": "VARCHAR", "value": "sistemas"}]


def test_request_cube_uses_only_allow_listed_dimensions_and_parameters():
    client = MagicMock()
    client.execute.return_value = [{"year": 2026, "status": "APPROVED", "request_count": 4}]

    rows = cube_rows(
        "requests",
        dimensions=["year", "status"],
        filters={"status": "APPROVED", "year": "2026"},
        tenant_id="minas",
        client=client,
    )

    assert rows[0]["request_count"] == 4
    sql, parameters = client.execute.call_args.args
    assert 'AS "year"' in sql
    assert 'AS "status"' in sql
    assert parameters == [
        {"type": "VARCHAR", "value": "minas"},
        {"type": "VARCHAR", "value": "APPROVED"},
        {"type": "BIGINT", "value": 2026},
    ]


def test_cube_rejects_unknown_dimensions_and_filters():
    with pytest.raises(DomainError, match="Unsupported analytics dimension"):
        cube_rows("requests", dimensions=["student_email"], filters={}, tenant_id="sistemas")
    with pytest.raises(DomainError, match="Unsupported analytics filter"):
        cube_rows("requests", dimensions=None, filters={"tenant": "another"}, tenant_id="sistemas")
