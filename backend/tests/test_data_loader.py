from pathlib import Path
import pytest
from app.data.loaders.csv_loader import CSVDataLoader, DataIngestionError


def test_load_valid_dataset():
    loader = CSVDataLoader()
    df, meta = loader.load_dataset("synthetic_market_data.csv")
    assert not df.empty
    assert "timestamp" in df.columns
    assert "target_value" in df.columns
    assert meta["row_count"] == len(df)
    assert meta["is_synthetic"] is True
    # Ensure chronological order
    assert df["timestamp"].is_monotonic_increasing


def test_path_traversal_prevention():
    loader = CSVDataLoader()
    with pytest.raises(DataIngestionError, match="Path traversal is not permitted"):
        loader.load_dataset("../../../etc/passwd")

    with pytest.raises(DataIngestionError, match="Path traversal is not permitted"):
        loader.load_dataset("/absolute/path/attack.csv")


def test_missing_dataset_raises_error():
    loader = CSVDataLoader()
    with pytest.raises(DataIngestionError, match="not found"):
        loader.load_dataset("non_existent_dataset.csv")


def test_load_dirty_csv_with_duplicates_and_unsorted(sample_dirty_csv, tmp_path):
    loader = CSVDataLoader(base_datasets_dir=tmp_path)
    df, meta = loader.load_dataset(sample_dirty_csv.name)
    # Check chronological ordering
    assert df["timestamp"].is_monotonic_increasing
    # Check duplicate handling: only 1 entry for 2024-01-02 remains
    d2 = df[df["timestamp"] == "2024-01-02"]
    assert len(d2) == 1
    # Check default policy keep_last took 102.5
    assert float(d2["target_value"].iloc[0]) == 102.5


def test_empty_csv_raises_error(tmp_path):
    empty_file = tmp_path / "empty.csv"
    empty_file.write_text("")
    loader = CSVDataLoader(base_datasets_dir=tmp_path)
    with pytest.raises(DataIngestionError):
        loader.load_dataset("empty.csv")
