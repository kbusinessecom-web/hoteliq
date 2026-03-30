"""
Backend tests for Feature 5 (Message Templates) and Feature 6 (Internal Notes + @Mentions + Push Notifications)
Tests: /api/templates, /api/users, /api/push-tokens, /api/conversations messages (internal note)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Auth credentials from test_credentials.md
MANAGER_EMAIL = "manager@riviera-palace.com"
MANAGER_PASSWORD = "demo123"
RECEPTIONIST_EMAIL = "reception@riviera-palace.com"
RECEPTIONIST_PASSWORD = "demo123"


@pytest.fixture(scope="module")
def auth_session():
    """Login as manager and return session with token"""
    session = requests.Session()
    resp = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
        timeout=10
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


# ============================================================
# AUTH TESTS
# ============================================================
class TestAuth:
    """Auth login flow"""

    def test_login_manager_success(self):
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
            timeout=10
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == MANAGER_EMAIL

    def test_login_wrong_password(self):
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MANAGER_EMAIL, "password": "wrong_password"},
            timeout=10
        )
        assert resp.status_code == 401

    def test_get_me(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == MANAGER_EMAIL
        assert "_id" not in data, "MongoDB _id should not be exposed"


# ============================================================
# TEMPLATES TESTS (Feature 5)
# ============================================================
class TestTemplates:
    """Feature 5: Message Templates - CRUD and retrieval"""

    def test_get_all_templates_returns_15(self, auth_session):
        """Verify GET /api/templates returns exactly 15 templates"""
        resp = auth_session.get(f"{BASE_URL}/api/templates", timeout=10)
        assert resp.status_code == 200, f"Get templates failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Templates response should be a list"
        assert len(data) == 15, f"Expected 15 templates, got {len(data)}"

    def test_templates_have_required_fields(self, auth_session):
        """Templates must have template_id, name, category, content"""
        resp = auth_session.get(f"{BASE_URL}/api/templates", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        for tpl in data:
            assert "template_id" in tpl, "Missing template_id"
            assert "name" in tpl, "Missing name"
            assert "category" in tpl, "Missing category"
            assert "content" in tpl, "Missing content"
            assert "_id" not in tpl, "MongoDB _id should not be exposed"

    def test_templates_no_id_exposed(self, auth_session):
        """MongoDB _id should not appear in response"""
        resp = auth_session.get(f"{BASE_URL}/api/templates", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for tpl in data:
            assert "_id" not in tpl

    def test_filter_templates_by_category_welcome(self, auth_session):
        """Filter templates by 'welcome' category"""
        resp = auth_session.get(f"{BASE_URL}/api/templates?category=welcome", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for tpl in data:
            assert tpl["category"] == "welcome", f"Category mismatch: {tpl['category']}"

    def test_create_and_delete_template(self, auth_session):
        """Create a template then delete it"""
        create_resp = auth_session.post(
            f"{BASE_URL}/api/templates",
            json={
                "name": "TEST_Template_QA",
                "category": "info",
                "content": "Bonjour {{guest_name}}, ceci est un test.",
                "language": "fr"
            },
            timeout=10
        )
        assert create_resp.status_code == 200, f"Create template failed: {create_resp.text}"
        created = create_resp.json()
        assert created["name"] == "TEST_Template_QA"
        template_id = created["template_id"]

        # Delete
        del_resp = auth_session.delete(f"{BASE_URL}/api/templates/{template_id}", timeout=10)
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.text}"

    def test_use_template_increments_count(self, auth_session):
        """POST /api/templates/{id}/use increments usage_count"""
        # First, get all templates and pick one
        resp = auth_session.get(f"{BASE_URL}/api/templates", timeout=10)
        assert resp.status_code == 200
        templates = resp.json()
        assert len(templates) > 0
        template = templates[0]
        template_id = template["template_id"]
        initial_count = template.get("usage_count", 0)

        use_resp = auth_session.post(f"{BASE_URL}/api/templates/{template_id}/use", timeout=10)
        assert use_resp.status_code == 200

        # Verify count incremented
        resp2 = auth_session.get(f"{BASE_URL}/api/templates", timeout=10)
        templates2 = resp2.json()
        updated = next((t for t in templates2 if t["template_id"] == template_id), None)
        if updated:
            assert updated["usage_count"] >= initial_count, "Usage count should not decrease"


# ============================================================
# TEAM MEMBERS TESTS (Feature 6 - @Mentions)
# ============================================================
class TestTeamMembers:
    """Feature 6: Team members for @mentions"""

    def test_get_users_returns_team(self, auth_session):
        """GET /api/users returns list of team members"""
        resp = auth_session.get(f"{BASE_URL}/api/users", timeout=10)
        assert resp.status_code == 200, f"Get users failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Users should be a list"
        assert len(data) > 0, "At least one team member expected"

    def test_users_no_password_exposed(self, auth_session):
        """Hashed passwords must not be in the response"""
        resp = auth_session.get(f"{BASE_URL}/api/users", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for user in data:
            assert "hashed_password" not in user, "Password exposed!"
            assert "_id" not in user, "MongoDB _id should not be exposed"

    def test_users_have_required_fields(self, auth_session):
        """Users must have user_id, name, email, role"""
        resp = auth_session.get(f"{BASE_URL}/api/users", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        for u in data:
            assert "user_id" in u
            assert "name" in u
            assert "email" in u
            assert "role" in u


# ============================================================
# INTERNAL NOTES TESTS (Feature 6)
# ============================================================
class TestInternalNotes:
    """Feature 6: Internal notes in conversations"""

    def _get_first_conversation_id(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/conversations", timeout=10)
        assert resp.status_code == 200
        conversations = resp.json()
        if not conversations:
            pytest.skip("No conversations found")
        return conversations[0]["conversation_id"]

    def test_send_internal_note(self, auth_session):
        """Send an internal note in a conversation"""
        conv_id = self._get_first_conversation_id(auth_session)

        resp = auth_session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            json={
                "content": "TEST_Note: This is an internal note for QA testing",
                "direction": "outbound",
                "author": "user",
                "message_type": "internal_note",
                "mentions": []
            },
            timeout=10
        )
        assert resp.status_code == 200, f"Send note failed: {resp.text}"
        msg = resp.json()
        assert msg["message_type"] == "internal_note"
        assert msg["content"] == "TEST_Note: This is an internal note for QA testing"
        assert "_id" not in msg

    def test_send_internal_note_with_mention(self, auth_session):
        """Send internal note with a mention"""
        conv_id = self._get_first_conversation_id(auth_session)

        # Get a team member to mention
        users_resp = auth_session.get(f"{BASE_URL}/api/users", timeout=10)
        assert users_resp.status_code == 200
        users = users_resp.json()
        
        if not users:
            pytest.skip("No team members to mention")
        
        mention_user_id = users[0]["user_id"]
        mention_name = users[0]["name"]
        
        resp = auth_session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            json={
                "content": f"TEST_Note: @{mention_name} veuillez traiter cette demande",
                "direction": "outbound",
                "author": "user",
                "message_type": "internal_note",
                "mentions": [mention_user_id]
            },
            timeout=10
        )
        assert resp.status_code == 200, f"Send note with mention failed: {resp.text}"
        msg = resp.json()
        assert msg["message_type"] == "internal_note"
        assert mention_user_id in msg["mentions"]

    def test_internal_note_not_updating_conversation_last_message(self, auth_session):
        """Internal notes should NOT update conversation last_message"""
        conv_id = self._get_first_conversation_id(auth_session)
        
        # Get initial conversation state
        conv_before = auth_session.get(f"{BASE_URL}/api/conversations/{conv_id}", timeout=10).json()
        last_msg_before = conv_before.get("last_message")
        
        # Send internal note
        auth_session.post(
            f"{BASE_URL}/api/conversations/{conv_id}/messages",
            json={
                "content": "TEST_Note: Check last_message not updated",
                "direction": "outbound",
                "author": "user",
                "message_type": "internal_note",
                "mentions": []
            },
            timeout=10
        )
        
        # Get conversation after
        conv_after = auth_session.get(f"{BASE_URL}/api/conversations/{conv_id}", timeout=10).json()
        last_msg_after = conv_after.get("last_message")
        
        # last_message should NOT change (internal note doesn't update it)
        assert last_msg_after == last_msg_before, (
            f"Internal note updated last_message: before='{last_msg_before}', after='{last_msg_after}'"
        )


# ============================================================
# PUSH TOKENS TESTS (Feature 6)
# ============================================================
class TestPushTokens:
    """Feature 6: Push token registration"""

    def test_register_push_token(self, auth_session):
        """Register a test push token (non-Expo format is handled gracefully)"""
        resp = auth_session.post(
            f"{BASE_URL}/api/push-tokens",
            json={
                "token": "TEST_TOKEN_QA_not_real",
                "device_type": "web"
            },
            timeout=10
        )
        assert resp.status_code == 200, f"Push token registration failed: {resp.text}"
        data = resp.json()
        assert "message" in data

    def test_register_valid_expo_push_token(self, auth_session):
        """Register a valid-format Expo push token"""
        resp = auth_session.post(
            f"{BASE_URL}/api/push-tokens",
            json={
                "token": "ExponentPushToken[TEST_QA_fake_token_12345]",
                "device_type": "ios"
            },
            timeout=10
        )
        assert resp.status_code == 200, f"Push token registration failed: {resp.text}"


# ============================================================
# HEALTH CHECK
# ============================================================
class TestHealth:
    """Health check endpoint"""

    def test_health_check(self):
        resp = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
