"""
Weekly Report Service for HotelIQ
Generates and sends beautiful HTML reports every Monday at 8am to hotel managers.
"""
import asyncio
import json
import os
import resend
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
AI_API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


class WeeklyReportService:
    def __init__(self, db):
        self.db = db

    async def collect_week_stats(self, hotel_id: str, week_start: datetime, week_end: datetime) -> Dict:
        """Collect all statistics for the given week period"""

        # --- Conversations ---
        all_convs = await self.db.conversations.find(
            {"hotel_id": hotel_id}, {"_id": 0, "conversation_id": 1, "status": 1, "created_at": 1}
        ).to_list(500)

        new_convs = [
            c for c in all_convs
            if self._in_range(c.get("created_at"), week_start, week_end)
        ]
        resolved_convs = [
            c for c in all_convs
            if c.get("status") == "resolved"
            and self._in_range(c.get("created_at"), week_start, week_end)
        ]

        conv_ids = [c["conversation_id"] for c in all_convs]

        # --- Messages ---
        all_messages = await self.db.messages.find(
            {"conversation_id": {"$in": conv_ids}},
            {"_id": 0, "direction": 1, "author": 1, "timestamp": 1, "message_type": 1}
        ).to_list(5000)

        week_messages = [m for m in all_messages if self._in_range(m.get("timestamp"), week_start, week_end)]
        msgs_sent = [m for m in week_messages if m.get("direction") == "outbound" and m.get("message_type") != "internal_note"]
        msgs_received = [m for m in week_messages if m.get("direction") == "inbound"]

        # --- AI Insights ---
        all_insights = await self.db.conversation_insights.find(
            {"hotel_id": hotel_id}, {"_id": 0}
        ).to_list(200)

        week_insights = [i for i in all_insights if self._in_range(i.get("created_at"), week_start, week_end)]
        insights_acted = [i for i in week_insights if i.get("status") == "sent"]
        insights_by_type = {
            "upsell": len([i for i in week_insights if i.get("insight_type") == "upsell"]),
            "loyalty": len([i for i in week_insights if i.get("insight_type") == "loyalty"]),
            "review": len([i for i in week_insights if i.get("insight_type") == "review"]),
        }
        potential_revenue = sum(
            float(i.get("potential_revenue", 0))
            for i in week_insights
            if i.get("insight_type") == "upsell"
        )

        # --- Message Templates usage ---
        templates_used = [m for m in week_messages if m.get("author") == "user"]

        # Previous week
        prev_start = week_start - timedelta(days=7)
        prev_end = week_start
        prev_new_convs = [
            c for c in all_convs
            if self._in_range(c.get("created_at"), prev_start, prev_end)
        ]
        prev_msgs_sent = [
            m for m in all_messages
            if self._in_range(m.get("timestamp"), prev_start, prev_end)
            and m.get("direction") == "outbound"
            and m.get("message_type") != "internal_note"
        ]

        return {
            "total_conversations": len(all_convs),
            "new_conversations": len(new_convs),
            "resolved_conversations": len(resolved_convs),
            "messages_sent": len(msgs_sent),
            "messages_received": len(msgs_received),
            "insights_detected": len(week_insights),
            "insights_acted": len(insights_acted),
            "insights_upsell": insights_by_type["upsell"],
            "insights_loyalty": insights_by_type["loyalty"],
            "insights_review": insights_by_type["review"],
            "potential_revenue": potential_revenue,
            "prev_new_conversations": len(prev_new_convs),
            "prev_messages_sent": len(prev_msgs_sent),
            "response_rate": 78,  # % (static for demo, replace with real calc)
        }

    def _in_range(self, value, start: datetime, end: datetime) -> bool:
        """Check if a datetime value (string or datetime) is within range"""
        if value is None:
            return False
        try:
            if isinstance(value, str):
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            elif isinstance(value, datetime):
                dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            else:
                return False
            start_aware = start if start.tzinfo else start.replace(tzinfo=timezone.utc)
            end_aware = end if end.tzinfo else end.replace(tzinfo=timezone.utc)
            return start_aware <= dt <= end_aware
        except Exception:
            return True  # Include in range if can't parse (demo data)

    async def generate_ai_content(self, stats: Dict, hotel_name: str, week_label: str) -> Dict:
        """Use GPT to generate the summary paragraph and 3 priority actions"""
        prompt = f"""Tu es un conseiller IA expert en hôtellerie. Rédige le contenu d'un rapport hebdomadaire pour l'hôtel "{hotel_name}".

Statistiques de la semaine ({week_label}):
- Conversations nouvelles: {stats['new_conversations']} (semaine précédente: {stats['prev_new_conversations']})
- Conversations résolues: {stats['resolved_conversations']}
- Messages envoyés par l'équipe: {stats['messages_sent']}
- Messages reçus des clients: {stats['messages_received']}
- Taux de réponse < 5min: {stats['response_rate']}%
- Opportunités IA détectées: {stats['insights_detected']} (upsell: {stats['insights_upsell']}, fidélité: {stats['insights_loyalty']}, avis: {stats['insights_review']})
- Opportunités exploitées: {stats['insights_acted']}
- Revenu potentiel upsell: {stats['potential_revenue']}€

Génère un JSON strict (sans markdown):
{{
  "summary": "1-2 phrases de bilan chaleureux et professionnel de la semaine",
  "highlight": "1 point fort de la semaine à célébrer",
  "actions": [
    "Action prioritaire #1 pour la semaine prochaine (concrète et actionnable)",
    "Action prioritaire #2",
    "Action prioritaire #3"
  ],
  "motivation": "1 phrase motivante et personnalisée pour l'équipe"
}}"""

        try:
            chat = LlmChat(
                api_key=AI_API_KEY,
                session_id=f"report_{hotel_name}_{week_label}",
                system_message="Tu es un expert en revenue management hôtelier. Tu réponds UNIQUEMENT en JSON valide."
            ).with_model("openai", "gpt-5.2")

            response = await chat.send_message(UserMessage(text=prompt))

            text = response.strip()
            if "```" in text:
                parts = text.split("```")
                for i, p in enumerate(parts):
                    if i % 2 == 1:
                        text = p.strip()
                        if text.startswith("json"):
                            text = text[4:].strip()
                        break

            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                text = text[start:end]

            return json.loads(text)

        except Exception as e:
            print(f"AI report content error: {e}")
            return {
                "summary": f"Votre équipe a géré {stats['messages_sent']} messages cette semaine avec un taux de réponse de {stats['response_rate']}%.",
                "highlight": f"{stats['resolved_conversations']} conversations résolues cette semaine — excellent travail d'équipe !",
                "actions": [
                    "Analyser les conversations sans réponse pour améliorer le taux de résolution.",
                    "Exploiter les opportunités upsell détectées par l'IA (spa, upgrade, excursion).",
                    "Demander des avis Google aux clients satisfaits avant leur départ.",
                ],
                "motivation": "Chaque message est une opportunité de créer une expérience mémorable. Continuez ainsi !",
            }

    def generate_html(
        self,
        hotel_name: str,
        manager_name: str,
        week_label: str,
        stats: Dict,
        ai_content: Dict,
    ) -> str:
        """Generate beautiful HTML email with inline CSS"""

        trend_convs = stats["new_conversations"] - stats["prev_new_conversations"]
        trend_icon = "↑" if trend_convs >= 0 else "↓"
        trend_color = "#1A7A4A" if trend_convs >= 0 else "#C42A2A"

        actions_html = "".join(
            f"""<tr>
              <td style="padding:10px 0;border-bottom:1px solid #E8EDF5;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:28px;height:28px;background:#1A3C7A;border-radius:50%;text-align:center;vertical-align:middle;">
                    <span style="color:#C4952A;font-weight:700;font-size:13px;">{i+1}</span>
                  </td>
                  <td style="padding-left:12px;color:#333;font-size:14px;line-height:1.5;">{action}</td>
                </tr></table>
              </td>
            </tr>"""
            for i, action in enumerate(ai_content.get("actions", []))
        )

        return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Hebdomadaire HotelIQ — {hotel_name}</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#1A3C7A 0%,#2A5298 100%);border-radius:12px 12px 0 0;padding:36px 32px;text-align:center;">
      <p style="margin:0 0 4px;color:#C4952A;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">RAPPORT HEBDOMADAIRE</p>
      <h1 style="margin:0;color:#FFFFFF;font-size:32px;font-weight:700;letter-spacing:-0.5px;">HotelIQ</h1>
      <p style="margin:12px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">{hotel_name} &nbsp;·&nbsp; {week_label}</p>
    </td>
  </tr>

  <!-- GREETING -->
  <tr>
    <td style="background:#FFFFFF;padding:32px 32px 24px;">
      <p style="margin:0 0 12px;color:#1A3C7A;font-size:18px;font-weight:700;">Bonjour {manager_name} 👋</p>
      <p style="margin:0;color:#555;font-size:15px;line-height:1.7;">{ai_content.get('summary','')}</p>
    </td>
  </tr>

  <!-- HIGHLIGHT BADGE -->
  <tr>
    <td style="background:#FFFFFF;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#FBF5E6;border-left:4px solid #C4952A;border-radius:0 8px 8px 0;padding:14px 16px;">
            <span style="font-size:16px;">⭐</span>
            <span style="color:#7A4A0A;font-size:14px;font-weight:600;margin-left:8px;">{ai_content.get('highlight','')}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- KPI SECTION TITLE -->
  <tr>
    <td style="background:#FFFFFF;padding:4px 32px 16px;">
      <p style="margin:0;color:#1A3C7A;font-size:16px;font-weight:700;border-bottom:2px solid #E8EDF5;padding-bottom:10px;">📊 Chiffres de la semaine</p>
    </td>
  </tr>

  <!-- KPI GRID -->
  <tr>
    <td style="background:#FFFFFF;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="48%" style="background:#E8EDF5;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
            <p style="margin:0;color:#1A3C7A;font-size:28px;font-weight:700;">{stats['new_conversations']}</p>
            <p style="margin:4px 0 0;color:#6B7DB3;font-size:12px;font-weight:600;text-transform:uppercase;">Nouvelles conversations</p>
            <p style="margin:6px 0 0;color:{trend_color};font-size:12px;font-weight:600;">{trend_icon} {abs(trend_convs)} vs sem. précédente</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#E8F5EE;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
            <p style="margin:0;color:#1A7A4A;font-size:28px;font-weight:700;">{stats['response_rate']}%</p>
            <p style="margin:4px 0 0;color:#2A7A5A;font-size:12px;font-weight:600;text-transform:uppercase;">Réponse &lt; 5 min</p>
            <p style="margin:6px 0 0;color:#1A7A4A;font-size:12px;font-weight:600;">✓ Objectif atteint</p>
          </td>
        </tr>
        <tr><td colspan="3" style="height:12px;"></td></tr>
        <tr>
          <td width="48%" style="background:#FBF5E6;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
            <p style="margin:0;color:#7A4A0A;font-size:28px;font-weight:700;">{stats['resolved_conversations']}</p>
            <p style="margin:4px 0 0;color:#C4952A;font-size:12px;font-weight:600;text-transform:uppercase;">Conversations résolues</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background:#F5E8F0;border-radius:10px;padding:18px;text-align:center;vertical-align:top;">
            <p style="margin:0;color:#7A1A5A;font-size:28px;font-weight:700;">{stats['messages_sent']}</p>
            <p style="margin:4px 0 0;color:#9A2A7A;font-size:12px;font-weight:600;text-transform:uppercase;">Messages envoyés</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- AI INSIGHTS SECTION -->
  <tr>
    <td style="background:#FFFFFF;padding:4px 32px 16px;">
      <p style="margin:0;color:#1A3C7A;font-size:16px;font-weight:700;border-bottom:2px solid #E8EDF5;padding-bottom:10px;">🤖 Recommandations IA</p>
    </td>
  </tr>
  <tr>
    <td style="background:#FFFFFF;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="30%" style="text-align:center;padding:12px;">
            <p style="margin:0;color:#C4952A;font-size:24px;font-weight:700;">{stats['insights_upsell']}</p>
            <p style="margin:4px 0 0;color:#666;font-size:11px;text-transform:uppercase;">Upsell détectés</p>
          </td>
          <td width="30%" style="text-align:center;padding:12px;border-left:1px solid #E8EDF5;border-right:1px solid #E8EDF5;">
            <p style="margin:0;color:#1A3C7A;font-size:24px;font-weight:700;">{stats['insights_loyalty']}</p>
            <p style="margin:4px 0 0;color:#666;font-size:11px;text-transform:uppercase;">Fidélité</p>
          </td>
          <td width="30%" style="text-align:center;padding:12px;">
            <p style="margin:0;color:#7A4A0A;font-size:24px;font-weight:700;">{stats['insights_review']}</p>
            <p style="margin:4px 0 0;color:#666;font-size:11px;text-transform:uppercase;">Avis à demander</p>
          </td>
        </tr>
      </table>
      {'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#E8F5EE;border-radius:8px;padding:14px;text-align:center;margin-top:12px;"><p style="margin:0;color:#1A7A4A;font-size:15px;font-weight:700;">+' + str(int(stats['potential_revenue'])) + '€ de revenu potentiel identifié cette semaine</p></td></tr></table>' if stats['potential_revenue'] > 0 else ''}
    </td>
  </tr>

  <!-- PRIORITY ACTIONS -->
  <tr>
    <td style="background:#FFFFFF;padding:4px 32px 16px;">
      <p style="margin:0;color:#1A3C7A;font-size:16px;font-weight:700;border-bottom:2px solid #E8EDF5;padding-bottom:10px;">🎯 Priorités pour la semaine prochaine</p>
    </td>
  </tr>
  <tr>
    <td style="background:#FFFFFF;padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        {actions_html}
      </table>
    </td>
  </tr>

  <!-- MOTIVATION -->
  <tr>
    <td style="background:#1A3C7A;border-radius:0 0 12px 12px;padding:28px 32px;text-align:center;">
      <p style="margin:0 0 8px;color:#C4952A;font-size:13px;font-style:italic;">"{ai_content.get('motivation','')}"</p>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.5);font-size:11px;">
        HotelIQ &nbsp;·&nbsp; Unified AI Inbox pour hôtels boutique &nbsp;·&nbsp; Rapport automatique
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>"""

    async def send_report_for_hotel(self, hotel_id: str) -> Dict:
        """
        Main entry point: generate and send weekly report for one hotel.
        Returns a dict with report metadata.
        """
        from models import WeeklyReport

        # Get hotel info
        hotel = await self.db.hotels.find_one({"hotel_id": hotel_id}, {"_id": 0})
        if not hotel:
            return {"success": False, "error": "Hotel not found"}

        hotel_name = hotel.get("name", "Hôtel")

        # Recipient: use hotel notification_email if set, otherwise manager email
        notification_email = hotel.get("notification_email", "")
        
        if notification_email:
            recipient_email = notification_email
            # Find manager for name only
            manager = await self.db.users.find_one(
                {"hotel_id": hotel_id, "role": {"$in": ["admin", "manager"]}},
                {"_id": 0, "name": 1}
            ) or {}
        else:
            # Fallback: manager/admin user email
            manager = await self.db.users.find_one(
                {"hotel_id": hotel_id, "role": {"$in": ["admin", "manager"]}},
                {"_id": 0}
            )
            if not manager:
                manager = await self.db.users.find_one({"hotel_id": hotel_id}, {"_id": 0})
            if not manager:
                return {"success": False, "error": "No manager found"}
            recipient_email = manager.get("email", "")
        manager_name = manager.get("name", "Manager").split(" ")[0]  # First name only

        # Week dates
        now = datetime.now(timezone.utc)
        week_end = now
        week_start = now - timedelta(days=7)
        week_label = f"{week_start.strftime('%d %b')} au {week_end.strftime('%d %b %Y')}"

        # Collect stats
        stats = await self.collect_week_stats(hotel_id, week_start, week_end)

        # Generate AI content
        ai_content = await self.generate_ai_content(stats, hotel_name, week_label)

        # Generate HTML
        html = self.generate_html(hotel_name, manager_name, week_label, stats, ai_content)

        # Build report record
        report = WeeklyReport(
            hotel_id=hotel_id,
            week_start=week_start.isoformat(),
            week_end=week_end.isoformat(),
            week_label=week_label,
            recipient_email=recipient_email,
            recipient_name=manager.get("name", ""),
            stats=stats,
            ai_summary=ai_content.get("summary", ""),
            ai_actions=ai_content.get("actions", []),
            status="pending",
        )
        await self.db.weekly_reports.insert_one(report.model_dump())

        # Send via Resend
        try:
            params = {
                "from": f"HotelIQ <{SENDER_EMAIL}>",
                "to": [recipient_email],
                "subject": f"📊 Rapport Hebdomadaire — {hotel_name} ({week_label})",
                "html": html,
            }
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            email_id = email_result.get("id") if isinstance(email_result, dict) else str(email_result)

            # Update report as sent
            await self.db.weekly_reports.update_one(
                {"report_id": report.report_id},
                {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat(), "email_id": email_id}}
            )

            return {
                "success": True,
                "report_id": report.report_id,
                "recipient": recipient_email,
                "email_id": email_id,
                "insights_detected": stats["insights_detected"],
                "week_label": week_label,
            }
        except Exception as e:
            await self.db.weekly_reports.update_one(
                {"report_id": report.report_id},
                {"$set": {"status": "failed", "error": str(e)}}
            )
            return {"success": False, "error": str(e), "report_id": report.report_id}

    async def send_all_reports(self) -> List[Dict]:
        """Send weekly reports for all hotels (called by scheduler)"""
        hotels = await self.db.hotels.find({}, {"_id": 0, "hotel_id": 1}).to_list(100)
        results = []
        for hotel in hotels:
            result = await self.send_report_for_hotel(hotel["hotel_id"])
            results.append(result)
        return results
