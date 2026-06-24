import logging
import urllib.request
import urllib.parse
import re
import json
import redis
from typing import Dict, Any, List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings
from app.rag.retrieval import rag_retriever
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

logger = logging.getLogger("app.agents.base_node")


def get_llm(model_name: Optional[str] = None):
    if settings.GROK_API_KEY and settings.GROK_API_KEY != "mock-grok-key":
        # Route to Groq if key starts with gsk_
        if settings.GROK_API_KEY.startswith("gsk_"):
            actual_model = model_name or "llama-3.3-70b-versatile"
            return ChatOpenAI(
                model=actual_model,
                temperature=0.2,
                max_tokens=4096,
                openai_api_key=settings.GROK_API_KEY,
                openai_api_base="https://api.groq.com/openai/v1"
            )
        # Route to xAI Grok
        return ChatOpenAI(
            model="grok-beta",
            temperature=0.2,
            max_tokens=4096,
            openai_api_key=settings.GROK_API_KEY,
            openai_api_base="https://api.xai.ai/v1"
        )
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "mock-openai-key":
        actual_model = model_name or "gpt-4o-mini"
        return ChatOpenAI(
            model=actual_model,
            temperature=0.2,
            max_tokens=4096,
            openai_api_key=settings.OPENAI_API_KEY
        )
    return None


async def call_agent_llm(
    system_prompt: str,
    user_prompt: str,
    agent_name: str
) -> str:
    llm = get_llm()
    if not llm:
        raise ValueError(
            f"No active LLM provider configured (Groq/OpenAI keys are missing or invalid). "
            f"Failed to execute agent: {agent_name}."
        )
    
    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt.replace("{", "{{").replace("}", "}}")),
            ("user", "{input}")
        ])
        chain = prompt | llm
        response = await chain.ainvoke({"input": user_prompt})
        return str(response.content)
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "rate limit" in err_msg.lower():
            fallback_model = "llama-3.1-8b-instant" if settings.GROK_API_KEY and settings.GROK_API_KEY.startswith("gsk_") else None
            if fallback_model:
                logger.warning(
                    f"Rate limit hit for agent {agent_name} using default model. "
                    f"Retrying with fallback model: {fallback_model}..."
                )
                try:
                    fallback_llm = get_llm(model_name=fallback_model)
                    prompt = ChatPromptTemplate.from_messages([
                        ("system", system_prompt.replace("{", "{{").replace("}", "}}")),
                        ("user", "{input}")
                    ])
                    chain = prompt | fallback_llm
                    response = await chain.ainvoke({"input": user_prompt})
                    return str(response.content)
                except Exception as fallback_err:
                    logger.error(f"Fallback model LLM call failed for agent {agent_name}: {fallback_err}")
                    raise RuntimeError(f"Agent {agent_name} inference failed on fallback: {fallback_err}") from fallback_err
        
        logger.error(f"LLM call failed for agent {agent_name}: {e}")
        raise RuntimeError(f"Agent {agent_name} inference failed: {e}") from e


def query_rag_for_agent(query: str, project_id: Optional[str] = None) -> str:
    # Retrieve RAG context to enrich prompts
    results = rag_retriever.retrieve(query, project_id=project_id)
    if not results:
        return "No additional framework document context found in knowledge base."
    
    context_str = ""
    for r in results[:2]:
        meta = r["metadata"]
        context_str += f"\n- [{meta['source_title']} (Page {meta['page']})]: {r['content']}\n"
    return context_str


def get_web_search_results(query: str) -> List[Dict[str, Any]]:
    import ssl
    url = "https://lite.duckduckgo.com/lite/"
    data = urllib.parse.urlencode({"q": query}).encode("utf-8")
    req = urllib.request.Request(
        url, 
        data=data,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    )
    results = []
    try:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10, context=context) as response:
            html = response.read().decode("utf-8")
            # Try to match anchor tags with result-link class
            matches = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*class=["\']result-link["\'][^>]*>(.*?)</a>', html, re.DOTALL)
            if not matches:
                matches = re.findall(r'<a[^>]+class=["\']result-link["\'][^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)
            snippets = re.findall(r'<[^>]*class=["\']result-snippet["\'][^>]*>(.*?)(?:</td>|</div>)', html, re.DOTALL)
            
            for i in range(min(len(matches), len(snippets), 3)):
                link, raw_title = matches[i]
                t = re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', '', raw_title)).strip()
                s = re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', '', snippets[i])).strip()
                if len(s) > 250:
                    s = s[:247] + "..."
                results.append({"title": t, "snippet": s, "link": link})
    except Exception as e:
        logger.error(f"DuckDuckGo search error in base search helper: {e}")
    return results


async def generate_search_queries(idea: str, category_or_industry: str, query_type: str) -> list[str]:
    """
    Generate highly targeted, realistic search queries based on the startup idea and category.
    query_type: 'market', 'competitors', or 'technical'
    """
    llm = get_llm()
    if not llm:
        # Fallback to simple heuristics
        words = [w for w in idea.split() if len(w) > 3][:4]
        keywords = " ".join(words)
        if query_type == 'market':
            return [f"{category_or_industry} {keywords} market size", f"{category_or_industry} industry trends 2026"]
        elif query_type == 'competitors':
            return [f"{category_or_industry} {keywords} competitors", f"{category_or_industry} pricing models"]
        else:
            return [f"scalable {category_or_industry} {keywords} architecture", f"{category_or_industry} hosting cost breakdown"]

    if query_type == 'market':
        system_prompt = (
            "You are a search query optimizer. Given a startup idea and category/industry, generate exactly 2 highly effective, "
            "realistic search queries to find market size, TAM/SAM/SOM, or growth trends of this specific niche.\n"
            "Return only a JSON list of strings, e.g. [\"query1\", \"query2\"]. Do not include markdown code block formatting or explanations."
        )
    elif query_type == 'competitors':
        system_prompt = (
            "You are a search query optimizer. Given a startup idea and category/industry, generate exactly 2 highly effective, "
            "realistic search queries to find actual competitors, alternatives, and pricing models of this specific niche.\n"
            "Return only a JSON list of strings, e.g. [\"query1\", \"query2\"]. Do not include markdown code block formatting or explanations."
        )
    else:
        system_prompt = (
            "You are a search query optimizer. Given a startup idea and category/industry, generate exactly 2 highly effective, "
            "realistic search queries to find system architecture patterns, database choices, or starting server costs for this niche.\n"
            "Return only a JSON list of strings, e.g. [\"query1\", \"query2\"]. Do not include markdown code block formatting or explanations."
        )

    user_prompt = f"Startup Idea: {idea}\nCategory/Industry: {category_or_industry}"
    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt)
        ])
        chain = prompt | llm
        response = await chain.ainvoke({})
        content = str(response.content).strip().replace("```json", "").replace("```", "").strip()
        queries = json.loads(content, strict=False)
        if isinstance(queries, list) and len(queries) >= 2:
            return [str(q) for q in queries[:2]]
    except Exception as e:
        err_msg = str(e)
        if ("429" in err_msg or "rate limit" in err_msg.lower()) and settings.GROK_API_KEY and settings.GROK_API_KEY.startswith("gsk_"):
            logger.warning(f"Rate limit hit during search query generation. Retrying with fallback model...")
            try:
                fallback_llm = get_llm(model_name="llama-3.1-8b-instant")
                if fallback_llm:
                    prompt = ChatPromptTemplate.from_messages([
                        ("system", system_prompt),
                        ("user", user_prompt)
                    ])
                    chain = prompt | fallback_llm
                    response = await chain.ainvoke({})
                    content = str(response.content).strip().replace("```json", "").replace("```", "").strip()
                    queries = json.loads(content, strict=False)
                    if isinstance(queries, list) and len(queries) >= 2:
                        return [str(q) for q in queries[:2]]
            except Exception as fallback_err:
                logger.warning(f"Failed to generate search queries with fallback model: {fallback_err}")
        else:
            logger.warning(f"Failed to generate search queries using LLM: {e}")
    
    # Heuristic fallback
    words = [w for w in idea.split() if len(w) > 3][:4]
    keywords = " ".join(words)
    if query_type == 'market':
        return [f"{category_or_industry} {keywords} market size", f"{category_or_industry} industry trends 2026"]
    elif query_type == 'competitors':
        return [f"{category_or_industry} {keywords} competitors", f"{category_or_industry} pricing models"]
    else:
        return [f"scalable {category_or_industry} {keywords} architecture", f"{category_or_industry} hosting cost breakdown"]


async def append_run_log(run_id: str, message: str):
    if not run_id:
        logger.warning(f"No run_id provided for log: {message}")
        return
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(
                text("SELECT logs, status, current_step FROM workflow_runs WHERE id = :rid"),
                {"rid": run_id}
            )
            row = res.fetchone()
            if row:
                logs = dict(row[0] or {"steps": []})
                if "steps" not in logs:
                    logs["steps"] = []
                logs["steps"].append(message)
                
                await db.execute(
                    text("UPDATE workflow_runs SET logs = :logs, updated_at = NOW() WHERE id = :rid"),
                    {"logs": json.dumps(logs), "rid": run_id}
                )
                await db.commit()
                
                try:
                    r = redis.Redis.from_url(settings.REDIS_URL)
                    r.publish(f"run:{run_id}", json.dumps({
                        "status": row[1],
                        "current_step": row[2],
                        "log": message
                    }))
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Failed to append run log for run {run_id}: {e}")


def _clean_json_string(s: str) -> str:
    # Remove single-line comments // that are not inside quotes or part of URLs
    processed_lines = []
    for line in s.splitlines():
        if "//" in line:
            parts = line.split("//", 1)
            # If quotes in first part are even, // is outside any string literal
            if parts[0].count('"') % 2 == 0 and not parts[0].strip().endswith(("http:", "https:")):
                line = parts[0]
        processed_lines.append(line)
    cleaned = "\n".join(processed_lines)
    # Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r',\s*([\]}])', r'\1', cleaned)
    return cleaned.strip()


def parse_json_markdown(text: str) -> Dict[str, Any]:
    def clean_and_load(s: str) -> Dict[str, Any]:
        cleaned = _clean_json_string(s)
        return json.loads(cleaned, strict=False)

    # 1. Try to find JSON inside markdown code blocks
    pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            return clean_and_load(match.group(1))
        except Exception:
            pass
            
    # 2. If no markdown block or parsing failed, find first '{' and last '}'
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_str = text[first_brace:last_brace + 1]
        try:
            return clean_and_load(json_str)
        except Exception:
            pass
            
    # 3. Fallback to basic clean and load
    clean_text = text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    elif clean_text.startswith("```"):
        clean_text = clean_text[3:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    
    return clean_and_load(clean_text)


