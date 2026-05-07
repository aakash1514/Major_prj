import joblib
import os
from pathlib import Path

class DemandModel:
    """
    A class to load and use the trained demand prediction model.
    Loads the model from models/demand_predictor_xgb.pkl using joblib.
    """
    
    def __init__(self, model_path='models/demand_predictor_xgb.pkl'):
        """
        Initialize the DemandModel by loading the trained model.
        
        Args:
            model_path (str): Path to the saved model file. Defaults to 'models/demand_predictor_xgb.pkl'
        
        Raises:
            FileNotFoundError: If the model file does not exist at the specified path.
        """
        # Get the absolute path to the model file
        base_dir = Path(__file__).parent
        self.model_path = base_dir / model_path
        
        # Check if model file exists
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        
        # Load the model using joblib
        try:
            self.model = joblib.load(self.model_path)
            print(f"✓ Demand model loaded successfully from {self.model_path}")
        except Exception as e:
            raise Exception(f"Error loading model from {self.model_path}: {str(e)}")
    
    def predict(self, crop_features):
        """
        Predict the demand for a given crop.
        
        Args:
            crop_features: Input features for prediction. Can be:
                - A dictionary with feature names as keys
                - A numpy array or list of feature values
                - A pandas DataFrame with one row
        
        Returns:
            float: Predicted demand for the crop
        
        Raises:
            ValueError: If crop_features format is invalid or prediction fails.
        """
        try:
            # Make prediction
            prediction = self.model.predict(crop_features)
            
            # Return the predicted demand (handle both single and multiple predictions)
            if isinstance(prediction, (list, tuple)):
                return float(prediction[0]) if len(prediction) > 0 else None
            else:
                return float(prediction)
                
        except Exception as e:
            raise ValueError(f"Error during demand prediction: {str(e)}")
    
    def predict_batch(self, crop_features_list):
        """
        Predict demand for multiple crops at once.
        
        Args:
            crop_features_list: A list of crop features or a 2D array/DataFrame
        
        Returns:
            list: List of predicted demands
        """
        try:
            predictions = self.model.predict(crop_features_list)
            return [float(pred) for pred in predictions]
        except Exception as e:
            raise ValueError(f"Error during batch demand prediction: {str(e)}")


# Example usage
if __name__ == "__main__":
    try:
        # Initialize the demand model
        demand_model = DemandModel()
        
        # Example: Make a prediction with sample crop data
        # Note: Adjust the feature format based on your model's requirements
        sample_crop = [[1, 100, 25, 60]]  # Example: [crop_type, season, region, month]
        
        predicted_demand = demand_model.predict(sample_crop)
        print(f"Predicted demand: {predicted_demand:.2f} units")
        
    except Exception as e:
        print(f"Error: {e}")
