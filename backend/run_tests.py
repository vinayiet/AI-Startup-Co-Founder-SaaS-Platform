import asyncio
import json
import os
import sys

# Ensure backend module path is accessible
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.agents.graph import compiled_graph

ideas = [
    {
        "name": "Idea 1: CA Automation",
        "industry": "FinTech / SaaS",
        "description": """
Startup Idea: AI-powered invoice and GST filing automation 
platform for independent Chartered Accountants and small CA 
firms in India.

Problem: Independent CAs and small firms handle 50-200 client 
filings per month manually — extracting data from PDFs, 
cross-referencing GSTN portals, and filing returns one by one. 
The process is entirely manual, error-prone, and consumes 
60-70% of a CA's billable time on non-billable work.

Solution: A SaaS platform that ingests client invoices via 
WhatsApp or email, auto-extracts GST-relevant data using OCR 
and AI, reconciles GSTR-2B mismatches automatically, generates 
draft returns for CA review, and files directly via GST portal 
API integration.

Target customers: Independent CAs and CA firms with 1-10 
partners, managing 50-500 active clients.

Business model: Subscription SaaS at ₹2,999-₹7,999/month 
per CA firm, tiered by number of clients managed.

Geography: India — Maharashtra, Gujarat, Delhi NCR, Karnataka 
first.

Key assumptions to validate:
- CAs will trust AI-generated draft returns
- GST portal API integration is technically feasible
- Willingness to pay ₹3,000-₹8,000/month exists in this 
  segment
- CAC through CA association partnerships is under ₹5,000 
  per customer
        """
    },
    {
        "name": "Idea 2: EV Fleet Management",
        "industry": "Mobility / SaaS",
        "description": """
Startup Idea: EV fleet management and charging optimisation 
SaaS for last-mile delivery companies operating electric 
two-wheelers and three-wheelers in Indian Tier 1 cities.

Problem: Last-mile delivery companies (Shadowfax, Delhivery 
partners, hyperlocal D2C brands) are transitioning to EV 
fleets but managing them with the same tools built for petrol 
vehicles — no range anxiety management, no charging slot 
optimisation, no battery health monitoring, and no integration 
between vehicle telemetry and delivery route planning.

Solution: A fleet management platform with real-time battery 
telemetry, charging station slot booking and optimisation, 
predictive maintenance alerts, route planning adjusted for 
charge levels, and driver performance analytics — all 
integrated with existing delivery management systems via API.

Target customers: Last-mile delivery fleet operators running 
50-500 EVs, third-party logistics companies transitioning 
from petrol to electric fleets.

Business model: ₹500-₹1,500 per vehicle per month SaaS fee, 
plus a transaction fee on charging slot bookings made through 
the platform.

Geography: Bengaluru, Mumbai, Delhi NCR, Hyderabad — where 
EV adoption in delivery is most active.

Key assumptions to validate:
- Hardware telemetry integration is feasible across 
  multiple EV manufacturers
- Fleet operators will pay per-vehicle SaaS fees
- Charging infrastructure density is sufficient in 
  target cities
- CAC through fleet operator direct sales is under 
  ₹15,000 per account
        """
    },
    {
        "name": "Idea 3: Rural Vernacular Learning",
        "industry": "EdTech",
        "description": """
Startup Idea: Voice-based vernacular micro-learning platform 
for rural Indian workers in agriculture, construction, and 
informal retail — delivering daily 3-minute skill and 
financial literacy lessons in 12 regional languages via 
basic phone calls, no smartphone required.

Problem: 300 million rural Indian workers have no access to 
skill development or financial literacy content — no 
smartphone, no internet, no time for structured learning. 
Government schemes exist but reach is poor. Private EdTech 
is entirely urban and smartphone-dependent.

Solution: A platform where workers receive a daily automated 
voice call of 3 minutes delivering one skill or financial 
literacy lesson in their local language. Employers, NGOs, 
and government schemes pay for worker subscriptions as a 
welfare benefit. Workers opt in via a missed call.

Target customers: 
Primary payer — employers (construction contractors, 
agri-input companies, cooperative banks) buying 
subscriptions for their workforce as a welfare benefit.
End user — rural workers receiving daily calls.

Business model: ₹50-₹150 per worker per month paid by 
employer or NGO sponsor. Revenue also from government 
skilling scheme partnerships (PMKVY, NSDC).

Geography: UP, Bihar, Rajasthan, MP — highest rural 
workforce density.

Key assumptions to validate:
- Employers will pay ₹50-150/worker/month as a welfare 
  benefit
- Workers will answer and engage with daily voice calls
- Government partnership revenue is achievable within 
  18 months
- CAC through employer direct sales and NGO partnerships 
  is under ₹8,000 per employer account
        """
    }
]

async def run_tests():
    for i, test in enumerate(ideas[2:]):
        run_id = f"test-run-{i+3}"
        print(f"=======================")
        print(f"RUNNING: {test['name']}")
        print(f"=======================")
        
        state = {
            "project_id": "test_project",
            "run_id": run_id,
            "idea": test['description'],
            "industry": test['industry'],
            "target_audience": "N/A",
            "current_step": "Idea Analyzer",
            "human_feedbacks": [],
            "category": "",
            "target_users": "",
            "business_model": "",
            "assumptions": "",
            "market_demand": "",
            "tam": "",
            "sam": "",
            "som": "",
            "market_trends": "",
            "competitors": [],
            "positioning": "",
            "opportunities": "",
            "tech_stack": "",
            "architecture": "",
            "infra_costs": "",
            "mvp_features": [],
            "priority_backlog": [],
            "roadmap": [],
            "revenue_model": "",
            "projections": {},
            "break_even": "",
            "launch_strategy": "",
            "acquisition_channels": [],
            "growth_hacks": [],
            "risks": [],
            "mitigations": [],
            "pitch_deck": [],
            "report": {},
            "eval_validation": {},
            "confidence_score": 0.0,
            "hallucinations": []
        }
        config = {"configurable": {"thread_id": run_id}}
        
        try:
            await compiled_graph.ainvoke(state, config=config)
            final_state = await compiled_graph.aget_state(config)
            
            # The report might be under final_state.values["report"]["compiled_sections"]
            report = final_state.values.get("report", {})
            compiled = report.get("compiled_sections", report)
            
            with open(f"{run_id}_summary.json", "w") as f:
                json.dump({
                    "summary": report.get("summary", ""),
                    "market": compiled.get("market", {}),
                    "reality_check": compiled.get("reality_check", {}),
                    "competitors": compiled.get("competitors", {}),
                    "financials": compiled.get("financials", {})
                }, f, indent=2)
                
            print(f"[{test['name']}] finished. Report saved to {run_id}_summary.json")
        except Exception as e:
            print(f"ERROR on {test['name']}: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
