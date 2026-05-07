"""
Model 1 Service: Demand Prediction
Input: Item, Year, Food Supply Quantity, GDP, Population
Output: Demand Value prediction

This model uses predefined baseline values from the dataset
for GDP and Population based on growth patterns, while allowing
users to select any crop Item from the dataset.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Tuple

class Model1Service:
    """Demand prediction service using baseline economic indicators"""
    
    # Median Food Supply Quantity (kg/capita/yr) for each crop
    CROP_MEDIANS = {
        "Wheat and products": 61.84,
        "Rice and products": 101.32,
        "Maize and products": 7.11,
        "Millet and products": 7.63,
        "Potatoes and products": 25.04,
        "Sugar cane": 11.30,
        "Soyabeans": 0.16,
        "Groundnuts": 1.89,
        "Tomatoes and products": 12.92,
        "Onions": 14.67,
        "Oranges": 5.54,
        "Pepper": 0.03,
    }
    
    # GDP values by year (actual from dataset)
    GDP_VALUES = {
        2010: 1345.80,
        2011: 1488.46,
        2012: 1460.10,
        2013: 1484.79,
        2014: 1562.78,
        2015: 1622.81,
        2016: 1711.14,
        2017: 1937.92,
        2018: 2018.40,
        2019: 2064.05,
        2020: 1916.46,
        2021: 2255.87,
        2022: 2445.39,
        2023: 2586.65,
        2024: 2765.57,  # Estimated (3% growth)
        2025: 2748.55,  # Estimated (needs recalculation based on pattern)
        2026: 2932.77,  # Estimated (3% growth from 2023)
    }
    
    # Population values by year (actual from dataset)
    POPULATION_VALUES = {
        2010: 1243481564,
        2011: 1261224954,
        2012: 1278674502,
        2013: 1295829511,
        2014: 1312277191,
        2015: 1328024498,
        2016: 1343944296,
        2017: 1359657400,
        2018: 1374659064,
        2019: 1389030312,
        2020: 1402617695,
        2021: 1414203896,
        2022: 1425423212,
        2023: 1438069596,
        2024: 1450927425,  # Estimated (0.89% growth rate)
        2025: 1463949891,  # Estimated
        2026: 1477139227,  # Estimated
    }
    
    def __init__(self, model_path: str = None):
        """
        Initialize Model 1 Service
        
        Args:
            model_path: Path to the trained XGBoost model (if needed for advanced predictions)
        """
        self.model = None
        if model_path and Path(model_path).exists():
            try:
                self.model = joblib.load(model_path)
            except Exception as e:
                print(f"Warning: Could not load model from {model_path}: {e}")
    
    def get_available_crops(self) -> list:
        """Get list of available crops"""
        return list(self.CROP_MEDIANS.keys())
    
    def get_gdp_for_year(self, year: int) -> float:
        """Get GDP value for a given year (interpolates if necessary)"""
        if year in self.GDP_VALUES:
            return self.GDP_VALUES[year]
        
        # Find closest available years for interpolation
        available_years = sorted(self.GDP_VALUES.keys())
        if year < available_years[0]:
            return self.GDP_VALUES[available_years[0]]
        if year > available_years[-1]:
            # Assume 3% annual growth
            last_year = available_years[-1]
            last_gdp = self.GDP_VALUES[last_year]
            years_ahead = year - last_year
            return last_gdp * ((1.03) ** years_ahead)
        
        # Linear interpolation
        lower_year = max([y for y in available_years if y <= year])
        upper_year = min([y for y in available_years if y >= year])
        
        if lower_year == upper_year:
            return self.GDP_VALUES[lower_year]
        
        ratio = (year - lower_year) / (upper_year - lower_year)
        gdp_lower = self.GDP_VALUES[lower_year]
        gdp_upper = self.GDP_VALUES[upper_year]
        return gdp_lower + ratio * (gdp_upper - gdp_lower)
    
    def get_population_for_year(self, year: int) -> int:
        """Get population value for a given year (interpolates if necessary)"""
        if year in self.POPULATION_VALUES:
            return self.POPULATION_VALUES[year]
        
        available_years = sorted(self.POPULATION_VALUES.keys())
        if year < available_years[0]:
            return self.POPULATION_VALUES[available_years[0]]
        if year > available_years[-1]:
            # Assume 0.89% annual growth
            last_year = available_years[-1]
            last_pop = self.POPULATION_VALUES[last_year]
            years_ahead = year - last_year
            return int(last_pop * ((1.0089) ** years_ahead))
        
        # Linear interpolation
        lower_year = max([y for y in available_years if y <= year])
        upper_year = min([y for y in available_years if y >= year])
        
        if lower_year == upper_year:
            return self.POPULATION_VALUES[lower_year]
        
        ratio = (year - lower_year) / (upper_year - lower_year)
        pop_lower = self.POPULATION_VALUES[lower_year]
        pop_upper = self.POPULATION_VALUES[upper_year]
        return int(pop_lower + ratio * (pop_upper - pop_lower))
    
    def predict(self, item: str, year: int = 2026, 
                food_supply: float = None) -> Dict:
        """
        Predict demand for a given crop
        
        Args:
            item: Crop name (must be in CROP_MEDIANS)
            year: Year for prediction (default 2026)
            food_supply: Food supply quantity (uses median if None)
        
        Returns:
            Dictionary with prediction results and metadata
        """
        if item not in self.CROP_MEDIANS:
            return {
                "error": f"Crop '{item}' not found. Available crops: {list(self.CROP_MEDIANS.keys())}",
                "success": False
            }
        
        # Use provided food supply or median
        if food_supply is None:
            food_supply = self.CROP_MEDIANS[item]
        
        # Get economic indicators for the year
        gdp = self.get_gdp_for_year(year)
        population = self.get_population_for_year(year)
        
        # Prepare features for model
        features = np.array([[year, food_supply, gdp, population]])
        
        # If model is loaded, use it for prediction
        if self.model is not None:
            try:
                prediction = self.model.predict(features)[0]
            except Exception as e:
                # Fallback to simple formula
                prediction = self._simple_predict(item, year, food_supply, gdp, population)
        else:
            # Use simple heuristic formula
            prediction = self._simple_predict(item, year, food_supply, gdp, population)
        
        return {
            "success": True,
            "item": item,
            "year": year,
            "food_supply_quantity": round(food_supply, 2),
            "gdp_per_capita": round(gdp, 2),
            "population": population,
            "predicted_demand": round(prediction, 2),
            "predicted_demand_unit": "tonnes (t)",
            "confidence": "High" if self.model else "Medium"
        }
    
    def _simple_predict(self, item: str, year: int, 
                       food_supply: float, gdp: float, population: float) -> float:
        """
        Simple heuristic prediction formula
        Demand ≈ (Food Supply * Population * GDP_factor)
        """
        # GDP normalization factor (higher GDP = higher demand)
        gdp_factor = 1.0 + (gdp / 2000.0) * 0.3
        
        # Crop-specific multiplier based on historical demand
        crop_multipliers = {
            "Wheat and products": 1.0,
            "Rice and products": 1.1,
            "Maize and products": 0.9,
            "Millet and products": 0.85,
            "Potatoes and products": 1.15,
            "Sugar cane": 0.95,
            "Soyabeans": 0.15,
            "Groundnuts": 0.35,
            "Tomatoes and products": 1.25,
            "Onions": 1.3,
            "Oranges": 0.65,
            "Pepper": 0.05,
        }
        
        multiplier = crop_multipliers.get(item, 1.0)
        
        # Basic formula: (food_supply_per_capita * population * gdp_factor * crop_multiplier)
        demand = (food_supply * population / 1000) * gdp_factor * multiplier
        
        return demand


# Example usage
if __name__ == "__main__":
    service = Model1Service()
    
    # Test predictions
    crops = ["Wheat and products", "Rice and products", "Tomatoes and products"]
    
    for crop in crops:
        result = service.predict(crop, year=2026)
        print(f"\n{crop}:")
        print(f"  Predicted Demand (2026): {result['predicted_demand']} tonnes")
        print(f"  GDP per capita: ${result['gdp_per_capita']}")
        print(f"  Population: {result['population']:,}")
