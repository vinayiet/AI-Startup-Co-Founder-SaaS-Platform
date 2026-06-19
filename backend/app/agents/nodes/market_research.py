import json
from app.agents.state import AgentState
from app.agents.nodes.base import call_agent_llm, query_rag_for_agent, get_web_search_results, append_run_log, generate_search_queries, parse_json_markdown


async def market_research_node(state: AgentState) -> AgentState:
    idea = state.get("idea", "")
    category = state.get("category", "")
    run_id = state.get("run_id")

    await append_run_log(run_id, "[Analyze] Parsing startup idea for market segmentation...")
    await append_run_log(run_id, "[Analyze] Querying static knowledge base for industry benchmarks...")
    rag_context = query_rag_for_agent(
        f"market size TAM SAM SOM estimation research trends {category}",
        project_id=state.get("project_id")
    )

    await append_run_log(run_id, "[Deep Research] Generating dynamic, targeted search queries for market size analysis...")
    queries = await generate_search_queries(idea, category, "market")

    await append_run_log(run_id, f"[Deep Research] Querying live web for '{queries[0]}'...")
    web_res_1 = get_web_search_results(queries[0])
    
    await append_run_log(run_id, f"[Deep Research] Querying live web for '{queries[1]}'...")
    web_res_2 = get_web_search_results(queries[1])
    
    web_context = ""
    for r in (web_res_1[:3] + web_res_2[:3]):
        web_context += f"- Title: {r['title']}\n  Details: {r['snippet']}\n"
        
    if not web_context:
        web_context = "No live search results retrieved."

    await append_run_log(run_id, "[Analyze] Merging RAG benchmarks and live web search data for TAM/SAM/SOM estimation...")

    system_prompt = (
        "You are an experienced Market Research Agent. Estimate the Total Addressable Market (TAM), "
        "Serviceable Addressable Market (SAM), Serviceable Obtainable Market (SOM), current market demand, "
        "and primary market trends for this business idea.\n\n"
        "GUIDELINES FOR REALISTIC ANALYSIS:\n"
        "1. Base your metrics directly on the facts and data points found in the Live Web Search Context. Never generate generic, perfectly rounded numbers.\n"
        "2. Break down your TAM, SAM, and SOM estimation logically in your 'market_demand' text (e.g. explain your assumptions, the target population size, or pricing averages used in a bottom-up calculation).\n"
        "3. Provide all monetary values (TAM, SAM, SOM) in both USD ($) and local currencies like Indian Rupees (₹ / INR). Use current conversion ratios (e.g. 1 USD = 83 INR).\n"
        "4. Output realistic market trends containing actual statistics or growth percentages where possible.\n\n"
        f"Live Web Search Context:\n{web_context}\n\n"
        f"RAG Guidelines:\n{rag_context}\n"
        "Return your analysis strictly in JSON format with these exact keys:\n"
        '{"market_demand": "...", "tam": "...", "sam": "...", "som": "...", "market_trends": "..."}'
    )

    user_prompt = f"Startup Idea: {idea}\nCategory: {category}"

    response_text = await call_agent_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        agent_name="Market Research"
    )

    try:
        data = parse_json_markdown(response_text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON response from Market Research LLM: {response_text}. Error: {e}")

    state["market_demand"] = data.get("market_demand", "")
    state["tam"] = data.get("tam", "")
    state["sam"] = data.get("sam", "")
    state["som"] = data.get("som", "")
    state["market_trends"] = data.get("market_trends", "")
    state["current_step"] = "Competitor Intelligence"

    await append_run_log(run_id, "Market Research validation completed.")
    return state
