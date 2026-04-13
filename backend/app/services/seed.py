from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import CriterionType, Dataset, DatasetCase, Difficulty, InviteCode


SEED_DATASETS = [
    {
        "id": "Tooling_v2_Global",
        "name": "Tooling_v2_Global",
        "description": "Multi-step tool orchestration tasks grounded in the auth service and read-only PostgreSQL views exposed by the platform.",
        "tags": ["tooling", "agent_ops"],
        "cases": [
            {
                "display_id": "TC-9042",
                "prompt": "Use the available tools to confirm whether the current signed-in user appears in the platform user directory, then summarize the matching record.",
                "expected_behavior": "The answer should confirm whether the current user's email appears in the user directory and summarize the matching record with email and team information.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["tooling", "auth", "postgres"],
            },
            {
                "display_id": "TC-9043",
                "prompt": "List the active datasets currently available for evaluation and report how many cases belong to each dataset.",
                "expected_behavior": "The answer should include each active dataset and the total number of cases for that dataset.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["tooling", "postgres", "reporting"],
            },
        ],
    },
    {
        "id": "LongContext_DocQA",
        "name": "LongContext_DocQA",
        "description": "Longer-form summarization tasks that require reading multiple catalog rows and producing grounded aggregate answers.",
        "tags": ["summarization", "postgres"],
        "cases": [
            {
                "display_id": "TC-9044",
                "prompt": "Read the case catalog and group the available evaluation cases by difficulty. Include one example display_id for each difficulty that exists.",
                "expected_behavior": "The answer should group cases by difficulty and include at least one example display_id for each reported difficulty.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.HARD,
                "tags": ["summarization", "postgres", "difficulty"],
            },
            {
                "display_id": "TC-9045",
                "prompt": "Based on the case catalog, identify which dataset currently has the most hard cases and explain the result briefly.",
                "expected_behavior": "The answer should identify the dataset with the highest number of hard cases and briefly explain the count-based result.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.HARD,
                "tags": ["summarization", "postgres", "analysis"],
            },
        ],
    },
    {
        "id": "AuthService_Basics",
        "name": "AuthService_Basics",
        "description": "Focused checks for the built-in auth service tool, including current-user lookup and invite validation.",
        "tags": ["auth", "identity"],
        "cases": [
            {
                "display_id": "TC-9101",
                "prompt": "Return the current signed-in user's email and team name. If team_name is empty, say that explicitly.",
                "expected_behavior": "The answer should explicitly include the current user's email and team name, or state that team_name is unavailable.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.EASY,
                "tags": ["auth", "identity"],
            },
            {
                "display_id": "TC-9102",
                "prompt": "Check whether invite code INV-DEMO-2026 is valid and report the remaining uses.",
                "expected_behavior": "The answer should clearly state whether invite code INV-DEMO-2026 is valid and include the remaining uses.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.EASY,
                "tags": ["auth", "validation"],
            },
            {
                "display_id": "TC-9103",
                "prompt": "Return the current signed-in user's profile as compact JSON with exactly two keys: email and team_name.",
                "expected_behavior": "The answer should be valid JSON containing the keys email and team_name for the current user.",
                "criterion_type": CriterionType.STRICT_JSON_MATCH,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["auth", "json"],
            },
        ],
    },
    {
        "id": "Postgres_ReadOnly_Catalog",
        "name": "Postgres_ReadOnly_Catalog",
        "description": "Read-only SQL tasks grounded in the agent_tools schema and its catalog-style views.",
        "tags": ["postgres", "catalog"],
        "cases": [
            {
                "display_id": "TC-9104",
                "prompt": "Use the read-only PostgreSQL catalog to list all available dataset ids and names.",
                "expected_behavior": "The answer should list the available datasets and mention both id and name for each one.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["postgres", "catalog"],
            },
            {
                "display_id": "TC-9105",
                "prompt": "Count how many cases belong to each dataset in agent_tools.case_catalog.",
                "expected_behavior": "The answer should provide a per-dataset case count derived from the case catalog.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["postgres", "aggregation"],
            },
            {
                "display_id": "TC-9106",
                "prompt": "How many users are currently registered in the system? Answer using the read-only user_directory view.",
                "expected_behavior": "The answer should state the total number of registered users based on the user_directory view.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.EASY,
                "tags": ["postgres", "users"],
            },
        ],
    },
    {
        "id": "AgentOps_ReadOnly_Summary",
        "name": "AgentOps_ReadOnly_Summary",
        "description": "Practical reporting tasks that combine auth context with read-only PostgreSQL views already exposed to the agent.",
        "tags": ["agent_ops", "reporting"],
        "cases": [
            {
                "display_id": "TC-9107",
                "prompt": "Check whether the current user's email appears in agent_tools.user_directory and summarize the matching record.",
                "expected_behavior": "The answer should confirm whether the current user's email appears in the user_directory view and summarize the matching record.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["agent_ops", "auth", "postgres"],
            },
            {
                "display_id": "TC-9108",
                "prompt": "List the active datasets and the total number of cases for each one in a concise table.",
                "expected_behavior": "The answer should include each active dataset and the total number of cases for that dataset.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["agent_ops", "reporting", "postgres"],
            },
            {
                "display_id": "TC-9109",
                "prompt": "Summarize the latest evaluation runs from agent_tools.run_catalog. If no runs are available, say that explicitly.",
                "expected_behavior": "The answer should summarize recent runs from run_catalog, or clearly state that no runs are available yet.",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["agent_ops", "runs", "postgres"],
            },
        ],
    },
]


def seed_base_data(db: Session) -> None:
    settings = get_settings()
    invite = db.scalar(select(InviteCode).where(InviteCode.code == settings.seed_invite_code))
    if invite is None:
        db.add(
            InviteCode(
                code=settings.seed_invite_code,
                team_name=settings.seed_team_name,
                is_active=True,
                max_uses=1000,
                used_count=0,
            )
        )

    for dataset_payload in SEED_DATASETS:
        dataset = db.get(Dataset, dataset_payload["id"])
        if dataset is None:
            dataset = Dataset(
                id=dataset_payload["id"],
                name=dataset_payload["name"],
                description=dataset_payload["description"],
                tags=dataset_payload["tags"],
                active=True,
            )
            db.add(dataset)
            db.flush()
        else:
            dataset.name = dataset_payload["name"]
            dataset.description = dataset_payload["description"]
            dataset.tags = dataset_payload["tags"]
            dataset.active = True

        existing_cases = {case.display_id: case for case in dataset.cases}
        for case_payload in dataset_payload["cases"]:
            existing_case = existing_cases.get(case_payload["display_id"])
            if existing_case is None:
                db.add(
                    DatasetCase(
                        dataset_id=dataset.id,
                        display_id=case_payload["display_id"],
                        prompt=case_payload["prompt"],
                        expected_behavior=case_payload["expected_behavior"],
                        criterion_type=case_payload["criterion_type"],
                        difficulty=case_payload["difficulty"],
                        tags=case_payload["tags"],
                    )
                )
                continue

            existing_case.prompt = case_payload["prompt"]
            existing_case.expected_behavior = case_payload["expected_behavior"]
            existing_case.criterion_type = case_payload["criterion_type"]
            existing_case.difficulty = case_payload["difficulty"]
            existing_case.tags = case_payload["tags"]

    db.commit()
