# core/agent.py
from price_model import PriceModel
from demand_model import DemandModel

class AgriAgent:

    def __init__(self, llm_engine):
        self.llm = llm_engine
        # Initialize ML models
        try:
            self.price_model = PriceModel()
        except Exception as e:
            print(f"Warning: Could not load PriceModel: {e}")
            self.price_model = None
        
        try:
            self.demand_model = DemandModel()
        except Exception as e:
            print(f"Warning: Could not load DemandModel: {e}")
            self.demand_model = None

    def build_prompt(self, user_query):

        prompt = f"""Agricultural Expert Response:

Question: {user_query}

Detailed Answer:"""

        return prompt

    def route_query(self, user_query):
        """
        Route the query to the appropriate handler based on keywords.
        
        Args:
            user_query (str): The user's question
            
        Returns:
            dict: Contains 'route' (str) and 'handler' (callable)
        """
        query_lower = user_query.lower()
        
        # Check for price-related keywords
        price_keywords = ['price', 'cost', 'rate', 'value', 'expensive', 'cheap', 'fair price', 'market price']
        if any(keyword in query_lower for keyword in price_keywords):
            return {
                'route': 'price',
                'handler': self.handle_price_query,
                'model': self.price_model
            }
        
        # Check for demand/supply-related keywords
        demand_keywords = ['demand', 'supply', 'quantity', 'shortage', 'surplus', 'availability', 'stock']
        if any(keyword in query_lower for keyword in demand_keywords):
            return {
                'route': 'demand',
                'handler': self.handle_demand_query,
                'model': self.demand_model
            }
        
        # Default: use LLM
        return {
            'route': 'llm',
            'handler': self.handle_llm_query,
            'model': None
        }

    def handle_price_query(self, user_query, crop_features=None):
        """
        Handle price prediction queries using PriceModel.
        
        Args:
            user_query (str): The user's question
            crop_features: Optional crop features for prediction
            
        Returns:
            dict: Prediction result with status and data
        """
        if not self.price_model:
            return {
                'status': 'error',
                'message': 'Price model not available',
                'route': 'price'
            }
        
        try:
            if crop_features is None:
                # If no features provided, fall back to LLM
                return self.handle_llm_query(user_query)
            
            predicted_price = self.price_model.predict(crop_features)
            return {
                'status': 'success',
                'route': 'price',
                'prediction': predicted_price,
                'message': f'Predicted market price: ${predicted_price:.2f}',
                'query': user_query
            }
        except Exception as e:
            return {
                'status': 'error',
                'route': 'price',
                'message': f'Error in price prediction: {str(e)}',
                'fallback': self.handle_llm_query(user_query)
            }

    def handle_demand_query(self, user_query, crop_features=None):
        """
        Handle demand prediction queries using DemandModel.
        
        Args:
            user_query (str): The user's question
            crop_features: Optional crop features for prediction
            
        Returns:
            dict: Prediction result with status and data
        """
        if not self.demand_model:
            return {
                'status': 'error',
                'message': 'Demand model not available',
                'route': 'demand'
            }
        
        try:
            if crop_features is None:
                # If no features provided, fall back to LLM
                return self.handle_llm_query(user_query)
            
            predicted_demand = self.demand_model.predict(crop_features)
            return {
                'status': 'success',
                'route': 'demand',
                'prediction': predicted_demand,
                'message': f'Predicted demand: {predicted_demand:.2f} units',
                'query': user_query
            }
        except Exception as e:
            return {
                'status': 'error',
                'route': 'demand',
                'message': f'Error in demand prediction: {str(e)}',
                'fallback': self.handle_llm_query(user_query)
            }

    def handle_llm_query(self, user_query):
        """
        Handle general queries using the LLM.
        
        Args:
            user_query (str): The user's question
            
        Returns:
            dict: LLM response with status and data
        """
        try:
            prompt = self.build_prompt(user_query)
            response = self.llm.generate(prompt, max_length=512, min_length=150)
            return {
                'status': 'success',
                'route': 'llm',
                'response': response,
                'query': user_query
            }
        except Exception as e:
            return {
                'status': 'error',
                'route': 'llm',
                'message': f'Error generating LLM response: {str(e)}'
            }

    def answer(self, user_query, crop_features=None):
        """
        Main method to answer user queries using intelligent routing.
        
        Args:
            user_query (str): The user's question
            crop_features: Optional features for ML model predictions
            
        Returns:
            dict: Response with status, route, and result
        """
        # Route the query
        routing_info = self.route_query(user_query)
        route = routing_info['route']
        handler = routing_info['handler']
        
        # Handle the query based on route
        if route in ['price', 'demand']:
            return handler(user_query, crop_features)
        else:
            return handler(user_query)