"""
Model 3 Service: Crop Recommendation
Input: Season, Soil Type, Region
Output: Recommended crop and expected yield

This model recommends suitable crops based on environmental conditions
and provides yield expectations.
"""

from typing import Dict, List
import random

class Model3Service:
    """Crop recommendation service based on environmental conditions"""
    
    # Crop suitability matrix
    CROP_SUITABILITY = {
        "Wheat and products": {
            "seasons": ["Winter", "Rabi"],
            "soil_types": ["Loamy", "Sandy Loam", "Alluvial"],
            "regions": ["North", "Central"],
            "expected_yield": 45.0,  # kg/hectare
        },
        "Rice and products": {
            "seasons": ["Summer", "Monsoon", "Kharif"],
            "soil_types": ["Clayey", "Loamy", "Alluvial"],
            "regions": ["East", "South", "North-East"],
            "expected_yield": 62.0,
        },
        "Maize and products": {
            "seasons": ["Kharif", "Summer"],
            "soil_types": ["Loamy", "Sandy Loam", "Silt Loam"],
            "regions": ["North", "Central", "South"],
            "expected_yield": 58.0,
        },
        "Millet and products": {
            "seasons": ["Kharif"],
            "soil_types": ["Loamy", "Sandy", "Laterite"],
            "regions": ["Central", "South", "North-East"],
            "expected_yield": 18.0,
        },
        "Potatoes and products": {
            "seasons": ["Winter", "Rabi"],
            "soil_types": ["Loamy", "Sandy Loam", "Well-drained"],
            "regions": ["North", "Central"],
            "expected_yield": 250.0,
        },
        "Sugar cane": {
            "seasons": ["All Year"],
            "soil_types": ["Loamy", "Clayey", "Alluvial"],
            "regions": ["South", "Central", "North"],
            "expected_yield": 75.0,
        },
        "Soyabeans": {
            "seasons": ["Kharif"],
            "soil_types": ["Loamy", "Black Soil", "Well-drained"],
            "regions": ["Central", "North"],
            "expected_yield": 22.0,
        },
        "Groundnuts": {
            "seasons": ["Kharif", "Summer"],
            "soil_types": ["Sandy", "Sandy Loam", "Red Soil"],
            "regions": ["South", "Central", "North"],
            "expected_yield": 35.0,
        },
        "Tomatoes and products": {
            "seasons": ["Winter", "Summer"],
            "soil_types": ["Loamy", "Sandy Loam", "Well-drained"],
            "regions": ["North", "South", "Central"],
            "expected_yield": 450.0,
        },
        "Onions": {
            "seasons": ["Winter", "Rabi"],
            "soil_types": ["Loamy", "Sandy Loam", "Well-drained"],
            "regions": ["North", "Central", "South"],
            "expected_yield": 350.0,
        },
        "Oranges": {
            "seasons": ["Winter"],
            "soil_types": ["Loamy", "Sandy Loam", "Well-drained"],
            "regions": ["South", "Central"],
            "expected_yield": 280.0,
        },
        "Pepper": {
            "seasons": ["All Year"],
            "soil_types": ["Clayey", "Well-drained"],
            "regions": ["South"],
            "expected_yield": 8.0,
        },
    }
    
    SEASON_OPTIONS = [
        "Kharif", "Rabi", "Summer", "Winter", 
        "Monsoon", "North-East", "All Year"
    ]
    
    SOIL_OPTIONS = [
        "Loamy", "Sandy", "Clayey", "Sandy Loam",
        "Silt Loam", "Black Soil", "Red Soil",
        "Laterite", "Alluvial", "Well-drained"
    ]
    
    REGION_OPTIONS = [
        "North", "South", "East", "West",
        "Central", "North-East", "North-West"
    ]
    
    def __init__(self):
        """Initialize Model 3 Service"""
        pass
    
    def get_seasons(self) -> List[str]:
        """Get available seasons"""
        return self.SEASON_OPTIONS
    
    def get_soil_types(self) -> List[str]:
        """Get available soil types"""
        return self.SOIL_OPTIONS
    
    def get_regions(self) -> List[str]:
        """Get available regions"""
        return self.REGION_OPTIONS
    
    def recommend_crops(self, season: str, soil_type: str, 
                        region: str) -> Dict:
        """
        Recommend crops suitable for given conditions
        
        Args:
            season: Growing season
            soil_type: Type of soil
            region: Geographic region
        
        Returns:
            Dictionary with recommended crops and details
        """
        # Validate inputs
        if season not in self.SEASON_OPTIONS:
            return {
                "error": f"Invalid season. Available: {self.SEASON_OPTIONS}",
                "success": False
            }
        
        if soil_type not in self.SOIL_OPTIONS:
            return {
                "error": f"Invalid soil type. Available: {self.SOIL_OPTIONS}",
                "success": False
            }
        
        if region not in self.REGION_OPTIONS:
            return {
                "error": f"Invalid region. Available: {self.REGION_OPTIONS}",
                "success": False
            }
        
        # Find suitable crops
        recommended = []
        for crop_name, suitability in self.CROP_SUITABILITY.items():
            score = self._calculate_suitability_score(
                season, soil_type, region, suitability
            )
            if score > 0:
                recommended.append({
                    "crop": crop_name,
                    "suitability_score": round(score, 2),
                    "expected_yield": suitability["expected_yield"],
                    "yield_unit": "tonnes/hectare",
                })
        
        # Sort by suitability score
        recommended.sort(key=lambda x: x["suitability_score"], reverse=True)
        
        return {
            "success": True,
            "season": season,
            "soil_type": soil_type,
            "region": region,
            "total_recommendations": len(recommended),
            "top_recommendation": recommended[0] if recommended else None,
            "all_recommendations": recommended[:5],  # Top 5
        }
    
    def _calculate_suitability_score(self, season: str, soil_type: str,
                                    region: str, suitability: Dict) -> float:
        """
        Calculate how suitable a crop is for given conditions
        Score: 0-100
        """
        score = 0.0
        
        # Season match
        if season in suitability["seasons"] or "All Year" in suitability["seasons"]:
            score += 40
        elif season == "All Year":
            score += 30
        
        # Soil type match
        if soil_type in suitability["soil_types"]:
            score += 35
        else:
            # Partial credit for similar soil types
            soil_categories = {
                "Sandy": ["Sandy Loam", "Sandy"],
                "Loamy": ["Loamy", "Sandy Loam", "Silt Loam", "Alluvial"],
                "Clayey": ["Clayey", "Black Soil"],
                "Well-drained": ["Well-drained", "Loamy", "Sandy Loam"],
            }
            for category, soils in soil_categories.items():
                if soil_type in soils and any(s in suitability["soil_types"] for s in soils):
                    score += 20
                    break
        
        # Region match
        if region in suitability["regions"]:
            score += 25
        
        return score
    
    def get_crop_details(self, crop_name: str) -> Dict:
        """Get detailed information about a crop"""
        if crop_name not in self.CROP_SUITABILITY:
            return {"error": f"Crop '{crop_name}' not found", "success": False}
        
        crop = self.CROP_SUITABILITY[crop_name]
        return {
            "success": True,
            "crop": crop_name,
            "suitable_seasons": crop["seasons"],
            "suitable_soil_types": crop["soil_types"],
            "suitable_regions": crop["regions"],
            "expected_yield": crop["expected_yield"],
            "yield_unit": "tonnes/hectare",
        }


# Example usage
if __name__ == "__main__":
    service = Model3Service()
    
    result = service.recommend_crops("Kharif", "Loamy", "North")
    print("\nCrop Recommendations:")
    print(f"Top Recommendation: {result['top_recommendation']['crop']}")
    print(f"Suitability Score: {result['top_recommendation']['suitability_score']}/100")
    print(f"Expected Yield: {result['top_recommendation']['expected_yield']} tonnes/hectare")
