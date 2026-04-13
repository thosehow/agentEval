from app.services.run_executor import RunExecutor


def register_user(client):
  response = client.post(
    "/api/auth/register",
    json={
      "email": "tester@example.com",
      "password": "password123",
      "confirm_password": "password123",
      "invite_code": "INV-DEMO-2026",
    },
  )
  assert response.status_code == 201, response.text
  return response.json()


def test_auth_flow(client):
  payload = register_user(client)
  assert payload["email"] == "tester@example.com"

  me_response = client.get("/api/auth/me")
  assert me_response.status_code == 200
  assert me_response.json()["email"] == "tester@example.com"

  logout_response = client.post("/api/auth/logout")
  assert logout_response.status_code == 204

  unauthorized = client.get("/api/auth/me")
  assert unauthorized.status_code == 401


def test_dataset_endpoints(client):
  register_user(client)

  datasets_response = client.get("/api/datasets")
  assert datasets_response.status_code == 200
  datasets = datasets_response.json()
  assert len(datasets) >= 2

  dataset_id = datasets[0]["id"]
  detail_response = client.get(f"/api/datasets/{dataset_id}")
  assert detail_response.status_code == 200
  detail = detail_response.json()
  initial_count = len(detail["cases"])

  create_case = client.post(
    f"/api/datasets/{dataset_id}/cases",
    json={
      "prompt": "测试新的评测用例",
      "expected_behavior": "系统应返回结构化结果。",
      "criterion_type": "accuracy_threshold",
      "difficulty": "medium",
      "tags": ["逻辑推理", "格式"],
    },
  )
  assert create_case.status_code == 201, create_case.text

  refreshed_detail = client.get(f"/api/datasets/{dataset_id}").json()
  assert len(refreshed_detail["cases"]) == initial_count + 1


def test_create_benchmark_and_lab_runs(client, monkeypatch):
  register_user(client)
  monkeypatch.setattr(RunExecutor, "launch", classmethod(lambda cls, run_id: None))

  datasets = client.get("/api/datasets").json()
  dataset_id = datasets[0]["id"]

  benchmark_response = client.post(
    "/api/runs",
    json={
      "name": "回归评测任务",
      "dataset_id": dataset_id,
    },
  )
  assert benchmark_response.status_code == 201, benchmark_response.text
  benchmark_run = benchmark_response.json()
  assert benchmark_run["status"] == "queued"
  assert benchmark_run["dataset_id"] == dataset_id

  lab_response = client.post(
    "/api/lab/runs",
    json={
      "name": "实验室调试",
      "user_prompt": "请分析当前账号的运行表现。",
      "model_name": "gemini-2.5-flash",
      "temperature": 0.72,
      "system_prompt": "你是一个严谨的评测助手。",
      "enabled_tools": {
        "postgres_hook": True,
        "aws_s3_bucket": False,
        "auth_service": True,
        "web_search_api": True,
      },
    },
  )
  assert lab_response.status_code == 201, lab_response.text
  lab_run = lab_response.json()
  assert lab_run["run_kind"] == "lab"
  assert lab_run["status"] == "queued"
