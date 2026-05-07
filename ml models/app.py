import streamlit as st
import joblib
import numpy as np
import pandas as pd

# ---- Load Model and Encoder ----
model = joblib.load("demand_predictor_xgb.pkl")

try:
    encoder = joblib.load("item_encoder.pkl")  # If LabelEncoder was used
except:
    encoder = None

# ---- UI ----
st.title("Crop Demand Prediction System 🌾📈")
st.write("Predict food demand based on supply, GDP, and population.")

# Inputs
item = st.selectbox("Select Item:", [
    "Wheat and products", "Pepper", "Rice", "Maize", "Sugar", "Milk", "Eggs", 
    # add full category list from dataset
])

year = st.number_input("Year", min_value=2000, max_value=2050, step=1)
supply = st.number_input("Food Supply (kg/capita/yr)", min_value=0.0)
gdp = st.number_input("GDP (value/capita)", min_value=0.0)
population = st.number_input("Population", min_value=0)

# ---- Convert Input to Model Format ----
if st.button("Predict Demand"):
    
    # encode item if required
    if encoder:
        item_encoded = encoder.transform([item])[0]
    else:
        # One-hot dummy structure
        sample_df = pd.DataFrame([[item, year, supply, gdp, population]],
                                 columns=["Item", "Year", "Food supply quantity (kg/capita/yr)", "GDP(value/cappita)", "Population"])
        
        sample_df = pd.get_dummies(sample_df)
        
        # Match training column order
        for col in model.get_booster().feature_names:
            if col not in sample_df.columns:
                sample_df[col] = 0
        
        sample_df = sample_df[model.get_booster().feature_names]
        input_data = sample_df.values

    if encoder:
        input_data = np.array([[item_encoded, year, supply, gdp, population]])

    # ---- Predict ----
    prediction = model.predict(input_data)[0]

    st.success(f"📌 Estimated Demand Value: **{prediction:.2f} tons**")
