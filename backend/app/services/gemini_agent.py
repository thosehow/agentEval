import json
import re
import time
from dataclasses import dataclass
from typing import Any

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.models import CriterionType, StepType
from app.services.tooling import ToolExecutionError, ToolExecutor
from app.utils.serialization import to_plain_data


JSON_BLOCK_PATTERN = re.compile(r"\{.*\}", re.DOTALL)
QUOTA_ERROR_MARKERS = ("resource_exhausted", "quota exceeded", "429")


@dataclass
class ExecutionResult:
    final_output: str
    steps: list[dict[str, Any]]
    raw_response: dict[str, Any] | None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int
    total_cost_usd: float


@dataclass
class JudgeResult:
    score: float
    passed: bool
    reason: str
    raw_response: dict[str, Any] | None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float


def estimate_cost_usd(model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = {
        "gemini-2.5-flash": (0.35 / 1_000_000, 1.05 / 1_000_000),
        "gemini-2.5-pro": (1.25 / 1_000_000, 5.0 / 1_000_000),
    }
    prompt_rate, completion_rate = rates.get(model_name, (0.5 / 1_000_000, 1.5 / 1_000_000))
    return round((prompt_tokens * prompt_rate) + (completion_tokens * completion_rate), 6)


class GeminiExecutionError(RuntimeError):
    pass


class GeminiQuotaExceededError(GeminiExecutionError):
    pass


def _is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in QUOTA_ERROR_MARKERS)


def _format_quota_error(model_name: str, exc: Exception) -> str:
    return (
        f"Gemini quota exhausted for model {model_name}. "
        "Please check Gemini billing/quota or switch to gemini-2.5-flash. "
        f"Original error: {exc}"
    )


class GeminiAgentService:
    def __init__(self) -> None:
        self.settings = get_settings()
        if not self.settings.gemini_api_key:
            raise GeminiExecutionError("GEMINI_API_KEY is not configured.")
        self.client = genai.Client(api_key=self.settings.gemini_api_key)

    def _generate_content(self, *, model_name: str, contents: Any, config: types.GenerateContentConfig) -> Any:
        try:
            return self.client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            if _is_quota_error(exc):
                raise GeminiQuotaExceededError(_format_quota_error(model_name, exc)) from exc
            raise

    def run_agent(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model_name: str,
        temperature: float,
        enabled_tools: dict[str, bool],
        tool_executor: ToolExecutor,
    ) -> ExecutionResult:
        contents: list[Any] = [
            types.Content(role="user", parts=[types.Part(text=user_prompt)]),
        ]
        tools = []
        declarations = tool_executor.get_function_declarations(enabled_tools)
        if declarations:
            tools.append(types.Tool(function_declarations=declarations))

        config = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=system_prompt,
            tools=tools or None,
        )

        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        steps: list[dict[str, Any]] = []
        final_output = ""
        last_response: Any = None
        started = time.perf_counter()

        for _ in range(self.settings.gemini_max_tool_rounds):
            response = self._generate_content(
                model_name=model_name,
                contents=contents,
                config=config,
            )
            last_response = response
            usage = getattr(response, "usage_metadata", None)
            prompt_tokens += int(getattr(usage, "prompt_token_count", 0) or 0)
            completion_tokens += int(getattr(usage, "candidates_token_count", 0) or 0)
            total_tokens += int(getattr(usage, "total_token_count", 0) or 0)

            candidate = response.candidates[0] if getattr(response, "candidates", None) else None
            model_content = getattr(candidate, "content", None)
            parts = list(getattr(model_content, "parts", []) or [])

            function_calls = []
            text_parts = []
            for part in parts:
                function_call = getattr(part, "function_call", None)
                if function_call:
                    function_calls.append(function_call)
                elif getattr(part, "text", None):
                    text_parts.append(part.text)

            if text_parts:
                steps.append(
                    {
                        "step_type": StepType.THOUGHT if function_calls else StepType.FINAL,
                        "title": "模型响应" if function_calls else "最终输出",
                        "content": "\n".join(text_parts).strip(),
                        "tool_name": None,
                        "tool_input": None,
                        "tool_output": None,
                        "latency_ms": None,
                        "raw_payload": None,
                    }
                )

            if not function_calls:
                final_output = (response.text or "\n".join(text_parts)).strip()
                break

            if model_content is not None:
                contents.append(model_content)

            for function_call in function_calls:
                args = to_plain_data(getattr(function_call, "args", {}) or {})
                tool_name = getattr(function_call, "name", "unknown_tool")
                steps.append(
                    {
                        "step_type": StepType.ACTION,
                        "title": f"调用工具 {tool_name}",
                        "content": f"{tool_name}({json.dumps(args, ensure_ascii=False)})",
                        "tool_name": tool_name,
                        "tool_input": args,
                        "tool_output": None,
                        "latency_ms": None,
                        "raw_payload": None,
                    }
                )

                tool_started = time.perf_counter()
                try:
                    result = tool_executor.execute(tool_name, args)
                except ToolExecutionError as exc:
                    result = {"error": str(exc)}
                elapsed = round((time.perf_counter() - tool_started) * 1000)
                steps.append(
                    {
                        "step_type": StepType.TOOL_RESULT,
                        "title": f"{tool_name} 结果",
                        "content": json.dumps(result, ensure_ascii=False)[:4000],
                        "tool_name": tool_name,
                        "tool_input": args,
                        "tool_output": result,
                        "latency_ms": elapsed,
                        "raw_payload": result,
                    }
                )

                function_response_part = types.Part.from_function_response(
                    name=tool_name,
                    response={"result": result},
                )
                contents.append(types.Content(role="user", parts=[function_response_part]))
        else:
            raise GeminiExecutionError("Gemini exceeded the maximum tool-calling rounds.")

        latency_ms = round((time.perf_counter() - started) * 1000)
        return ExecutionResult(
            final_output=final_output,
            steps=steps,
            raw_response=to_plain_data(last_response),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            total_cost_usd=estimate_cost_usd(model_name, prompt_tokens, completion_tokens),
        )

    def judge_case(
        self,
        *,
        expected_behavior: str,
        criterion_type: CriterionType,
        actual_output: str,
        model_name: str,
    ) -> JudgeResult:
        prompt = f"""
你是一个严格的 AI Agent 评测裁判。
请依据预期行为和评分准则，对输出打 0-100 分，并判断是否通过。

评分准则: {criterion_type.value}
预期行为: {expected_behavior}
实际输出:
{actual_output}

仅返回 JSON：
{{
  "score": 0,
  "passed": false,
  "reason": "..."
}}
""".strip()

        response = self._generate_content(
            model_name=self.settings.gemini_judge_model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1),
        )
        usage = getattr(response, "usage_metadata", None)
        prompt_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
        completion_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
        total_tokens = int(getattr(usage, "total_token_count", 0) or 0)

        score = 0.0
        passed = False
        reason = "Judge response could not be parsed."
        text = (response.text or "").strip()
        match = JSON_BLOCK_PATTERN.search(text)
        if match:
            try:
                payload = json.loads(match.group(0))
                score = float(payload.get("score", 0))
                passed = bool(payload.get("passed", score >= 60))
                reason = str(payload.get("reason", reason))
            except json.JSONDecodeError:
                pass
        else:
            lowered = actual_output.lower()
            passed = expected_behavior[:20].lower() in lowered
            score = 80.0 if passed else 40.0
            reason = "Fallback heuristic used because judge JSON was unavailable."

        return JudgeResult(
            score=max(0.0, min(score, 100.0)),
            passed=passed,
            reason=reason,
            raw_response=to_plain_data(response),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=estimate_cost_usd(model_name, prompt_tokens, completion_tokens),
        )
