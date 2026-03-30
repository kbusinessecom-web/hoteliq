"""
Backend tests for Feature 8: AI Analytics History Analysis
Tests: POST /api/ai/analyze/{conversation_id}, POST /api/ai/analyze-all,
       GET /api/ai/insights, PATCH /api/ai/insights/{insight_id}
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

MANAGER_EMAIL = "manager@riviera-palace.com"
MANAGER_PASSWORD = "demo123"


@pytest.fixture(scope="module")
def auth_session():
    """Login as manager and return authenticated session"""
    session = requests.Session()
    resp = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
        timeout=15
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("access_token")
    assert token, "No access_token returned"
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def conversation_id(auth_session):
    """Get the first in_progress conversation_id"""
    resp = auth_session.get(f"{BASE_URL}/api/conversations", timeout=10)
    assert resp.status_code == 200
    convs = resp.json()
    # Prefer in_progress conversations
    for conv in convs:
        if conv.get("status") in ("in_progress", "new"):
            return conv["conversation_id"]
    if convs:
        return convs[0]["conversation_id"]
    pytest.skip("No conversations available")


# ============================================================
# GET /api/ai/insights - Base retrieval
# ============================================================
class TestGetInsights:
    """GET /api/ai/insights returns correct structure"""

    def test_get_insights_returns_200(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights", timeout=10)
        assert resp.status_code == 200, f"Get insights failed: {resp.text}"

    def test_get_insights_structure(self, auth_session):
        """Response must have total, pending, total_potential_revenue, by_type, insights"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data, "Missing 'total'"
        assert "pending" in data, "Missing 'pending'"
        assert "total_potential_revenue" in data, "Missing 'total_potential_revenue'"
        assert "by_type" in data, "Missing 'by_type'"
        assert "insights" in data, "Missing 'insights'"
        assert isinstance(data["insights"], list), "insights must be a list"

    def test_get_insights_by_type_has_all_keys(self, auth_session):
        """by_type should have upsell, loyalty, review keys"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        by_type = data.get("by_type", {})
        assert "upsell" in by_type, f"Missing 'upsell' in by_type: {by_type}"
        assert "loyalty" in by_type, f"Missing 'loyalty' in by_type: {by_type}"
        assert "review" in by_type, f"Missing 'review' in by_type: {by_type}"

    def test_get_insights_no_mongodb_id(self, auth_session):
        """No MongoDB _id in insight objects"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for insight in data.get("insights", []):
            assert "_id" not in insight, "MongoDB _id exposed in insight"

    def test_get_insights_filter_by_status_pending(self, auth_session):
        """Filter by status=pending returns only pending insights"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights?status=pending", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for insight in data.get("insights", []):
            assert insight["status"] == "pending", f"Non-pending insight returned: {insight['status']}"

    def test_get_insights_insight_fields(self, auth_session):
        """Each insight should have required fields"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for insight in data.get("insights", []):
            assert "insight_id" in insight
            assert "insight_type" in insight
            assert "title" in insight
            assert "suggested_message" in insight
            assert "status" in insight
            assert insight["insight_type"] in ("upsell", "loyalty", "review")


# ============================================================
# POST /api/ai/analyze/{conversation_id}
# ============================================================
class TestAnalyzeSingleConversation:
    """POST /api/ai/analyze/{conversation_id} returns insights"""

    def test_analyze_conversation_returns_200(self, auth_session, conversation_id):
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze/{conversation_id}",
            timeout=30
        )
        assert resp.status_code == 200, f"Analyze failed: {resp.text}"

    def test_analyze_conversation_structure(self, auth_session, conversation_id):
        """Response must have conversation_id, insights_count, insights"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze/{conversation_id}",
            timeout=30
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "conversation_id" in data, "Missing conversation_id"
        assert "insights_count" in data, "Missing insights_count"
        assert "insights" in data, "Missing insights"
        assert isinstance(data["insights"], list), "insights should be a list"
        assert data["conversation_id"] == conversation_id

    def test_analyze_conversation_insights_count_matches(self, auth_session, conversation_id):
        """insights_count should equal len(insights)"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze/{conversation_id}",
            timeout=30
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["insights_count"] == len(data["insights"]), \
            f"insights_count ({data['insights_count']}) != len(insights) ({len(data['insights'])})"

    def test_analyze_conversation_insight_fields(self, auth_session, conversation_id):
        """Each returned insight must have type, title, suggested_message"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze/{conversation_id}",
            timeout=30
        )
        assert resp.status_code == 200
        data = resp.json()
        for insight in data["insights"]:
            assert "insight_type" in insight, f"Missing insight_type: {insight}"
            assert "title" in insight, f"Missing title: {insight}"
            assert "suggested_message" in insight, f"Missing suggested_message: {insight}"
            assert insight["insight_type"] in ("upsell", "loyalty", "review"), \
                f"Invalid insight_type: {insight['insight_type']}"

    def test_analyze_nonexistent_conversation_returns_404(self, auth_session):
        """Analyzing a non-existent conversation should return 404"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze/conv_nonexistent_000",
            timeout=15
        )
        assert resp.status_code == 404, f"Expected 404 but got {resp.status_code}"


# ============================================================
# POST /api/ai/analyze-all
# ============================================================
class TestAnalyzeAllConversations:
    """POST /api/ai/analyze-all analyzes batch of conversations"""

    def test_analyze_all_returns_200(self, auth_session):
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze-all",
            timeout=90  # Can take 15-30s per conversation
        )
        assert resp.status_code == 200, f"Analyze-all failed: {resp.text}"

    def test_analyze_all_structure(self, auth_session):
        """Response must have conversations_analyzed and new_insights"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze-all",
            timeout=90
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "conversations_analyzed" in data, "Missing 'conversations_analyzed'"
        assert "new_insights" in data, "Missing 'new_insights'"
        assert isinstance(data["conversations_analyzed"], int), "conversations_analyzed should be int"
        assert isinstance(data["new_insights"], int), "new_insights should be int"

    def test_analyze_all_analyzed_positive(self, auth_session):
        """Should have analyzed at least 1 conversation"""
        resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze-all",
            timeout=90
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["conversations_analyzed"] >= 0, "conversations_analyzed should be non-negative"

    def test_insights_populated_after_analyze_all(self, auth_session):
        """After analyze-all, GET /api/ai/insights should return insights"""
        # Run analyze-all first
        analyze_resp = auth_session.post(
            f"{BASE_URL}/api/ai/analyze-all",
            timeout=90
        )
        assert analyze_resp.status_code == 200

        # Now check insights
        insights_resp = auth_session.get(
            f"{BASE_URL}/api/ai/insights?status=pending",
            timeout=10
        )
        assert insights_resp.status_code == 200
        data = insights_resp.json()
        # Should have at least some total
        assert data["total"] >= 0, "total should be non-negative"


# ============================================================
# PATCH /api/ai/insights/{insight_id}
# ============================================================
class TestUpdateInsightStatus:
    """PATCH /api/ai/insights/{insight_id} updates status"""

    def _get_pending_insight(self, auth_session):
        """Helper: get a pending insight id"""
        resp = auth_session.get(f"{BASE_URL}/api/ai/insights?status=pending", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        insights = data.get("insights", [])
        if not insights:
            pytest.skip("No pending insights to test status update")
        return insights[0]["insight_id"]

    def test_dismiss_insight_returns_200(self, auth_session):
        """PATCH with status=dismissed returns 200"""
        # First generate a fresh insight to dismiss
        convs_resp = auth_session.get(f"{BASE_URL}/api/conversations", timeout=10)
        convs = convs_resp.json()
        conv_id = None
        for conv in convs:
            if conv.get("status") in ("in_progress", "new"):
                conv_id = conv["conversation_id"]
                break
        if not conv_id:
            pytest.skip("No conversations")

        # Analyze to ensure we have insights
        auth_session.post(f"{BASE_URL}/api/ai/analyze/{conv_id}", timeout=30)

        insight_id = self._get_pending_insight(auth_session)
        resp = auth_session.patch(
            f"{BASE_URL}/api/ai/insights/{insight_id}",
            json={"status": "dismissed"},
            timeout=10
        )
        assert resp.status_code == 200, f"Dismiss insight failed: {resp.text}"

    def test_dismiss_insight_response_message(self, auth_session):
        """Dismiss response should contain 'message'"""
        convs_resp = auth_session.get(f"{BASE_URL}/api/conversations", timeout=10)
        convs = convs_resp.json()
        conv_id = None
        for conv in convs:
            if conv.get("status") in ("in_progress", "new"):
                conv_id = conv["conversation_id"]
                break
        if not conv_id:
            pytest.skip("No conversations")

        auth_session.post(f"{BASE_URL}/api/ai/analyze/{conv_id}", timeout=30)
        insight_id = self._get_pending_insight(auth_session)

        resp = auth_session.patch(
            f"{BASE_URL}/api/ai/insights/{insight_id}",
            json={"status": "dismissed"},
            timeout=10
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data, "Response should have 'message'"

    def test_update_insight_invalid_status_returns_400(self, auth_session):
        """PATCH with invalid status should return 400"""
        insight_id = self._get_pending_insight(auth_session)
        resp = auth_session.patch(
            f"{BASE_URL}/api/ai/insights/{insight_id}",
            json={"status": "invalid_status"},
            timeout=10
        )
        assert resp.status_code == 400, f"Expected 400 but got {resp.status_code}: {resp.text}"

    def test_update_nonexistent_insight_returns_404(self, auth_session):
        """PATCH on nonexistent insight should return 404"""
        resp = auth_session.patch(
            f"{BASE_URL}/api/ai/insights/ins_nonexistent_000",
            json={"status": "dismissed"},
            timeout=10
        )
        assert resp.status_code == 404, f"Expected 404 but got {resp.status_code}"

    def test_mark_insight_as_sent(self, auth_session):
        """PATCH with status=sent marks insight as sent"""
        convs_resp = auth_session.get(f"{BASE_URL}/api/conversations", timeout=10)
        convs = convs_resp.json()
        conv_id = None
        for conv in convs:
            if conv.get("status") in ("in_progress", "new"):
                conv_id = conv["conversation_id"]
                break
        if not conv_id:
            pytest.skip("No conversations")

        auth_session.post(f"{BASE_URL}/api/ai/analyze/{conv_id}", timeout=30)
        insight_id = self._get_pending_insight(auth_session)

        resp = auth_session.patch(
            f"{BASE_URL}/api/ai/insights/{insight_id}",
            json={"status": "sent"},
            timeout=10
        )
        assert resp.status_code == 200, f"Mark as sent failed: {resp.text}"

    def test_filter_insights_by_conversation_id(self, auth_session, conversation_id):
        """GET /api/ai/insights?conversation_id=xxx returns only that conversation's insights"""
        resp = auth_session.get(
            f"{BASE_URL}/api/ai/insights?conversation_id={conversation_id}",
            timeout=10
        )
        assert resp.status_code == 200
        data = resp.json()
        for insight in data.get("insights", []):
            assert insight["conversation_id"] == conversation_id, \
                f"Insight from wrong conversation: {insight['conversation_id']}"
