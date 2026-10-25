def test_api_markets(client):
    response = client.get("/api/v1/markets")
    assert response.status_code == 200
    data = response.json()
    assert data["total_datasets"] >= 1
    assert any(d["dataset_name"] == "synthetic_market_data.csv" for d in data["datasets"])


def test_api_market_data(client):
    response = client.get("/api/v1/market-data?dataset=synthetic_market_data.csv&page=1&page_size=20")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_name"] == "synthetic_market_data.csv"
    assert data["page"] == 1
    assert len(data["data"]) == 20
    assert "timestamp" in data["data"][0]
    assert "target_value" in data["data"][0]


def test_api_data_summary(client):
    response = client.get("/api/v1/data/summary?dataset=synthetic_market_data.csv")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_name"] == "synthetic_market_data.csv"
    assert "descriptive_statistics" in data
    assert "outliers" in data
    assert "trend_summary" in data
    assert len(data["chart_preview"]) > 0


def test_api_forecast_naive(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "horizon": 5,
        "model_type": "baseline_naive",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["horizon"] == 5
    assert len(data["forecasts"]) == 5
    assert data["model_name"] == "Naive Persistence Baseline"


def test_api_forecast_sma(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "horizon": 7,
        "model_type": "baseline_sma",
        "sma_window": 5,
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["horizon"] == 7
    assert len(data["forecasts"]) == 7


def test_api_forecast_ridge(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "horizon": 7,
        "model_type": "ridge",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["horizon"] == 7
    assert len(data["forecasts"]) == 7
    assert data["forecasts"][0]["lower_bound"] is not None
    assert data["forecasts"][0]["upper_bound"] is not None


def test_api_models_list(client):
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert data["total_models"] >= 4
    model_ids = [m["model_id"] for m in data["models"]]
    assert "baseline_naive" in model_ids
    assert "baseline_sma" in model_ids
    assert "ridge" in model_ids


def test_api_evaluations(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "model_type": "ridge",
        "test_ratio": 0.2,
    }
    response = client.post("/api/v1/evaluations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "baseline_naive_metrics" in data
    assert "performance_improvement_pct" in data
    assert data["metrics"]["mae"] > 0


def test_api_error_on_invalid_dataset(client):
    payload = {
        "dataset_name": "malicious_or_missing.csv",
        "horizon": 5,
        "model_type": "baseline_naive",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 400
    assert "not found" in response.json()["detail"].lower()


def test_api_validation_error_on_horizon(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "horizon": 1000,  # exceeds le=60
        "model_type": "baseline_naive",
    }
    response = client.post("/api/v1/forecasts", json=payload)
    assert response.status_code == 422


def test_api_news_endpoint(client):
    response = client.get("/api/v1/news?query=Apple&limit=3")
    assert response.status_code == 200
    data = response.json()
    assert "sentiment" in data
    assert "articles" in data
    assert data["sentiment"]["verdict"] in ["Bullish", "Bearish", "Neutral"]


def test_api_narrative_endpoint(client):
    payload = {
        "dataset_name": "synthetic_market_data.csv",
        "horizon": 7,
    }
    response = client.post("/api/v1/analysis/narrative", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "narrative" in data
    assert len(data["narrative"]) > 50
    assert "source" in data
