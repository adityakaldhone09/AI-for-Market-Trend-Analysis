from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from scipy import stats

from app.core.config import settings
from app.data.loaders.csv_loader import CSVDataLoader
from app.data.preprocessing.cleaner import DataCleaner
from app.schemas.analysis import (
    ChartDataPoint,
    DataSummaryResponse,
    DescriptiveStats,
    MissingValueSummary,
    OutlierSummary,
    TrendSummary,
)
from app.schemas.market import DateRange


class AnalysisService:
    """Exploratory Data Analysis and statistical profiling for market time series."""

    def __init__(self):
        self.loader = CSVDataLoader()
        self.cleaner = DataCleaner()

    def generate_data_summary(
        self,
        dataset_name: Optional[str] = None,
        target_col: Optional[str] = None,
    ) -> DataSummaryResponse:
        """Computes comprehensive descriptive stats, outlier flags, and chart-ready preview."""
        target_dataset = dataset_name or settings.DEFAULT_DATASET
        df, meta = self.loader.load_dataset(target_dataset, target_col=target_col)
        selected_target = meta["default_target"]

        # 1. Missing Values
        missing_list: List[MissingValueSummary] = []
        for col in df.columns:
            cnt = int(df[col].isna().sum())
            pct = round((cnt / len(df)) * 100, 2)
            missing_list.append(MissingValueSummary(column=col, missing_count=cnt, missing_percentage=pct))

        # 2. Descriptive Statistics on Numeric Columns
        desc_dict: Dict[str, DescriptiveStats] = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            clean_series = df[col].dropna()
            if len(clean_series) == 0:
                continue

            # Calculate skewness and kurtosis
            try:
                sk = float(stats.skew(clean_series))
                kt = float(stats.kurtosis(clean_series))
            except Exception:
                sk, kt = None, None

            desc_dict[col] = DescriptiveStats(
                count=int(len(clean_series)),
                mean=round(float(clean_series.mean()), 4),
                std=round(float(clean_series.std()), 4) if len(clean_series) > 1 else 0.0,
                min=round(float(clean_series.min()), 4),
                p25=round(float(clean_series.quantile(0.25)), 4),
                median=round(float(clean_series.median()), 4),
                p75=round(float(clean_series.quantile(0.75)), 4),
                max=round(float(clean_series.max()), 4),
                skewness=round(sk, 4) if sk is not None else None,
                kurtosis=round(kt, 4) if kt is not None else None,
            )

        # 3. Outlier Analysis on Target
        outlier_raw = self.cleaner.detect_outliers_iqr(df, selected_target)
        outlier_summary = OutlierSummary(
            column=selected_target,
            method=outlier_raw["method"],
            outlier_count=outlier_raw["outlier_count"],
            outlier_percentage=outlier_raw["outlier_percentage"],
            lower_bound=outlier_raw["lower_bound"],
            upper_bound=outlier_raw["upper_bound"],
            outlier_indices=outlier_raw["outlier_indices"],
        )

        # 4. Trend Analysis
        target_series = df[selected_target].dropna().values
        start_val = float(target_series[0])
        end_val = float(target_series[-1])
        net_chg = round(end_val - start_val, 4)
        pct_chg = round(((end_val - start_val) / start_val) * 100, 2) if start_val != 0 else 0.0

        if pct_chg > 1.5:
            direction = "bullish"
        elif pct_chg < -1.5:
            direction = "bearish"
        else:
            direction = "sideways"

        # Annualized Volatility of daily returns (std of returns * sqrt(252))
        returns = pd.Series(target_series).pct_change().dropna()
        daily_vol = float(returns.std()) if len(returns) > 1 else 0.0
        annualized_vol = round(daily_vol * np.sqrt(252) * 100, 2)

        # Moving Averages
        s = pd.Series(target_series)
        sma_7 = s.rolling(7).mean()
        sma_30 = s.rolling(30).mean()

        trend = TrendSummary(
            target_column=selected_target,
            start_value=round(start_val, 2),
            end_value=round(end_val, 2),
            net_change=round(net_chg, 2),
            percentage_change=pct_chg,
            direction=direction,
            volatility=annualized_vol,
            sma_7_current=round(float(sma_7.iloc[-1]), 2) if pd.notna(sma_7.iloc[-1]) else None,
            sma_30_current=round(float(sma_30.iloc[-1]), 2) if pd.notna(sma_30.iloc[-1]) else None,
        )

        # 5. Chart Preview (last 60 observations for frontend rendering)
        preview_slice = df.tail(60).copy().reset_index(drop=True)
        preview_points: List[ChartDataPoint] = []
        outlier_set = set(outlier_raw["outlier_indices"])

        s_preview = preview_slice[selected_target]
        preview_sma7 = s_preview.rolling(7, min_periods=1).mean()
        preview_sma30 = s_preview.rolling(30, min_periods=1).mean()

        for idx, row in preview_slice.iterrows():
            ts_str = row["timestamp"].strftime("%Y-%m-%d") if isinstance(row["timestamp"], pd.Timestamp) else str(row["timestamp"])
            orig_idx = df.index[df["timestamp"] == row["timestamp"]].tolist()
            is_outlier = bool(orig_idx and orig_idx[0] in outlier_set)

            preview_points.append(
                ChartDataPoint(
                    timestamp=ts_str,
                    value=round(float(row[selected_target]), 2),
                    sma_7=round(float(preview_sma7.iloc[idx]), 2),
                    sma_30=round(float(preview_sma30.iloc[idx]), 2),
                    is_outlier=is_outlier,
                )
            )

        return DataSummaryResponse(
            dataset_name=meta["dataset_name"],
            source=meta["source"],
            is_synthetic=meta["is_synthetic"],
            row_count=meta["row_count"],
            date_range=DateRange(
                start_date=meta["date_range"]["start_date"],
                end_date=meta["date_range"]["end_date"],
            ),
            columns=meta["columns"],
            target_column=selected_target,
            missing_values=missing_list,
            descriptive_statistics=desc_dict,
            outliers=outlier_summary,
            trend_summary=trend,
            chart_preview=preview_points,
        )


analysis_service = AnalysisService()
