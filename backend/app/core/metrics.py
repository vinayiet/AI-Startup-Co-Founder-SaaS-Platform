from prometheus_client import Counter, Histogram

# Metric for counting overall workflow execution statuses
WORKFLOW_RUNS_TOTAL = Counter(
    "cofounder_workflow_runs_total",
    "Total count of multi-agent validation workflow runs",
    labelnames=["status"]
)

# Metric to monitor execution durations of individual nodes and graphs
WORKFLOW_DURATION_SECONDS = Histogram(
    "cofounder_workflow_run_duration_seconds",
    "Duration of multi-agent validation workflow runs in seconds",
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0, 600.0]
)

# Metric for counting token usage tallies across various models
LLM_TOKEN_USAGE_TOTAL = Counter(
    "cofounder_agent_token_usage_total",
    "Total tokens consumed by agent node runs",
    labelnames=["agent_name", "model_name", "token_type"]  # token_type: prompt, completion
)

# Metric to track accumulated operational LLM costs in USD
LLM_COST_TOTAL = Counter(
    "cofounder_agent_cost_total",
    "Estimated total accumulated API dollar costs in USD",
    labelnames=["agent_name", "model_name"]
)
