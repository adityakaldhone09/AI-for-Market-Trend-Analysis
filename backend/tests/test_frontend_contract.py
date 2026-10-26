from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_frontend_contract_markets():
    response = client.get("/api/v1/markets")
    assert response.status_code == 200
    data = response.json()
    assert "markets" in data or "datasets" in data
    items = data.get("markets") or data.get("datasets")
    assert len(items) >= 1
    sample = items[0]
    # Check that identifiers needed by frontend exist
    assert "dataset_name" in sample or "id" in sample or "symbol" in sample


def test_frontend_contract_market_data_with_market_id():
    # Verify that market_id=ibm_stock_daily actually loads IBM, NOT the default AAPL
    response = client.get("/api/v1/market-data?market_id=ibm_stock_daily&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "ibm" in data.get("dataset_name", "").lower()
    assert len(data.get("data", [])) == 5
    first_pt = data["data"][0]
    assert "timestamp" in first_pt or "date" in first_pt
    assert "target_value" in first_pt or "close" in first_pt or "value" in first_pt


def test_frontend_contract_data_summary_with_market_id():
    response = client.get("/api/v1/data/summary?market_id=ibm_stock_daily")
    assert response.status_code == 200
    data = response.json()
    assert "ibm" in data.get("dataset_name", "").lower()
    assert data.get("rowCount", 0) > 0
    assert data.get("startDate") is not None
    assert data.get("endDate") is not None
    assert len(data.get("features", [])) > 0
    assert "statistics" in data
    assert "missingValues" in data


def test_frontend_contract_models():
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) >= 4
    for m in data["models"]:
        assert m.get("id") or m.get("model_id") or m.get("key")
        assert "name" in m
        assert m.get("status") or m.get("readiness_status")


def test_frontend_contract_forecast_with_market_id_and_model_id():
    # Frontend payload shape
    payload = {
        "market_id": "ibm_stock_daily",
        "horizon": 5,
        "model_id": "ridge",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Confirm selected dataset and model survived
    assert "ibm" in data.get("dataset_name", "").lower()
    assert "ridge" in data.get("model_name", "").lower()
    assert data.get("horizon") == 5
    assert len(data.get("values", [])) == 5
    # Verify no fabricated zero evaluation metrics
    assert data.get("evaluation") is None or data.get("evaluation", {}).get("mae", 1.0) != 0.0
    first_val = data["values"][0]
    assert "date" in first_val
    assert "predicted" in first_val
    assert "lowerBound" in first_val
    assert "upperBound" in first_val


def test_frontend_contract_evaluation_with_market_id_and_model_id():
    payload = {
        "market_id": "ibm_stock_daily",
        "model_id": "ridge",
        "start_date": "2026-06-01",
        "end_date": "2026-10-23",
    }
    response = client.post("/api/v1/evaluations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ibm" in data.get("dataset_name", "").lower()
    assert "ridge" in data.get("model_name", "").lower()
    # True measured evaluation metrics
    assert data.get("metrics") is not None
    assert data["metrics"]["mae"] > 0
    assert data.get("period") is not None
    assert len(data.get("values", [])) > 0
    # Provenance flag: ibm_stock_daily is real synced data
    assert data.get("data_is_synthetic") is False


def test_frontend_contract_rejection_of_unsupported_model():
    payload = {
        "market_id": "ibm_stock_daily",
        "horizon": 5,
        "model_id": "nonexistent_transformer_v9",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 400
    assert "unknown model_type" in response.json()["detail"].lower()
