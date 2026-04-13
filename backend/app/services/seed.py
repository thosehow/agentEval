from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import CriterionType, Dataset, DatasetCase, Difficulty, InviteCode


SEED_DATASETS = [
    {
        "id": "Tooling_v2_Global",
        "name": "Tooling_v2_Global",
        "description": "专注于多步工具编排、API 调用序列以及从非标准错误响应中恢复的高精度评测集。",
        "tags": ["工具化", "逻辑推理"],
        "cases": [
            {
                "display_id": "TC-9042",
                "prompt": "获取当前用户最近的三张发票，并汇总第三季度的总应付金额。",
                "expected_behavior": "Agent 应调用 get_invoices(limit=3)，按日期过滤，并执行求和逻辑。",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.HARD,
                "tags": ["工具化", "逻辑推理", "财务"],
            },
            {
                "display_id": "TC-9043",
                "prompt": "从数据库找出状态为 flagged 的账目并解释风险。",
                "expected_behavior": "Agent 应先执行只读 SQL 查询，再基于结果输出结构化风险说明。",
                "criterion_type": CriterionType.RETRY_PROTOCOL_CHECK,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["工具化", "SQL"],
            },
        ],
    },
    {
        "id": "LongContext_DocQA",
        "name": "LongContext_DocQA",
        "description": "针对超长上下文文档的问答、摘要和信息提取能力进行深度评估。",
        "tags": ["长文本"],
        "cases": [
            {
                "display_id": "TC-9044",
                "prompt": "阅读上传到 S3 的审计报告并提取所有金额异常项。",
                "expected_behavior": "Agent 应先从 S3 读取文本，再给出金额异常项列表与对应证据。",
                "criterion_type": CriterionType.STRICT_JSON_MATCH,
                "difficulty": Difficulty.HARD,
                "tags": ["长文本", "格式"],
            },
            {
                "display_id": "TC-9045",
                "prompt": "搜索最近的监管更新，并说明它们对当前流程的影响。",
                "expected_behavior": "Agent 应调用 Web Search 获取最新资料，并明确引用来源链接。",
                "criterion_type": CriterionType.ACCURACY_THRESHOLD,
                "difficulty": Difficulty.MEDIUM,
                "tags": ["长文本", "逻辑推理"],
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

        existing_case_ids = {case.display_id for case in dataset.cases}
        for case_payload in dataset_payload["cases"]:
            if case_payload["display_id"] in existing_case_ids:
                continue
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

    db.commit()
