"""
Model 2 Service: Price Prediction
Input: Item, Year, Export Quantity, Import Quantity, GDP
Output: Fair Price prediction

This model predicts fair market price based on economic indicators
and trade flows for different crop items.
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict

class Model2Service:
    """Fair price prediction service"""
    
    # Baseline prices by crop (median from dataset Demand Value / estimated quantity)
    BASELINE_PRICES = {
        "Wheat and products": 25.50,
        "Rice and products": 40.80,
        "Maize and products": 15.20,
        "Millet and products": 18.90,
        "Potatoes and products": 8.50,
        "Sugar cane": 12.30,
        "Soyabeans": 35.50,
        "Groundnuts": 45.20,
        "Tomatoes and products": 22.40,
        "Onions": 18.90,
        "Oranges": 28.50,
        "Pepper": 85.50,
    }
    
    # Average export quantities (used for normalization)
    AVG_EXPORT_QUANTITIES = {
        "Wheat and products": 2000000,
        "Rice and products": 250000,
        "Maize and products": 3500000,
        "Millet and products": 80000,
        "Potatoes and products": 350000,
        "Sugar cane": 500,
        "Soyabeans": 150000,
        "Groundnuts": 20000,
        "Tomatoes and products": 150000,
        "Onions": 1600000,
        "Oranges": 50000,
        "Pepper": 25000,
    }
    
    def __init__(self, model_path: str = None):
        """
        Initialize Model 2 Service
        
        Args:
            model_path: Path to trained XGBoost price model
        """
        self.model = None
        if model_path and Path(model_path).exists():
            try:
                self.model = joblib.load(model_path)
            except Exception as e:
                print(f"Warning: Could not load model: {e}")
    
    def get_available_crops(self) -> list:
        """Get list of available crops"""
        return list(self.BASELINE_PRICES.keys())
    
    def predict(self, item: str, year: int = 2026,
                export_quantity: float = None,
                import_quantity: float = None,
                gdp: float = 2932.77) -> Dict:
        """
        Predict fair price for a crop
        
        Args:
            item: Crop name
            year: Year for prediction
            export_quantity: Export quantity in tonnes (uses average if None)
            import_quantity: Import quantity in tonnes (uses average if None)
            gdp: GDP per capita value (default 2026 estimated value)
        
        Returns:
            Dictionary with price prediction
        """
        if item not in self.BASELINE_PRICES:
            return {
                "error": f"Crop '{item}' not found",
                "success": False
            }
        
        # Use defaults if not provided
        if export_quantity is None:
            export_quantity = self.AVG_EXPORT_QUANTITIES.get(item, 500000)
        if import_quantity is None:
            import_quantity = 100000
        
        # Prepare features
        features = np.array([[year, export_quantity, import_quantity, gdp]])
        
        # Model prediction or fallback
        if self.model is not None:
            try:
                prediction = self.model.predict(features)[0]
            except:
                prediction = self._calculate_price(item, year, export_quantity, 
                                                   import_quantity, gdp)
        else:
            prediction = self._calculate_price(item, year, export_quantity,
                                              import_quantity, gdp)
        
        # Ensure realistic price
        prediction = max(1.0, min(prediction, 500.0))
        
        return {
            "success": True,
            "item": item,
            "year": year,
            "predicted_fair_price": round(prediction, 2),
            "price_unit": "INR per kg",
            "export_quantity": int(export_quantity),
            "import_quantity": int(import_quantity),
            "gdp_per_capita": round(gdp, 2),
            "confidence": "High" if self.model else "Medium",
            "price_range": {
                "min": round(prediction * 0.85, 2),
                "max": round(prediction * 1.15, 2)
            }
        }
    
    def _calculate_price(self, item: str, year: int,
                        export_qty: float, import_qty: float, gdp: float) -> float:
        """
        Calculate fair price using economic indicators
        Price = Baseline * GDP_factor * Supply_factor * Demand_factor
        """
        baseline = self.BASELINE_PRICES[item]
        
        # GDP factor: higher GDP generally means higher prices
        gdp_factor = 1.0 + (gdp - 2000) / 2000 * 0.2
        
        # Supply factor: higher exports relative to imports = lower price
        supply_factor = 1.0 - (export_qty / (export_qty + import_qty + 1)) * 0.15
        
        # Stability factor: based on year trend
        year_factor = 1.0 + (year - 2010) / 100 * 0.05
        
        # Calculate final price
        price = baseline * gdp_factor * supply_factor * year_factor
        
        return price


# Example usage
if __name__ == "__main__":
    service = Model2Service()
    
    crops = ["Wheat and products", "Rice and products"]
    
    for crop in crops:
        result = service.predict(crop)
        print(f"\n{crop}:")
        print(f"  Fair Price (2026): ₹{result['predicted_fair_price']} per kg")
        print(f"  Price Range: ₹{result['price_range']['min']} - ₹{result['price_range']['max']}")
