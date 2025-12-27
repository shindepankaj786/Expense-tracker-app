import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import xgboost as xgb
import os
import pickle

MODEL_FILE = "fraud_model.pkl"

class FraudModel:
    def __init__(self):
        self.iso_forest = IsolationForest(contamination=0.05, random_state=42)
        self.trained = False
        
    def generate_synthetic_data(self, n_samples=1000):
        # Generate normal spending
        normal_amounts = np.random.normal(500, 200, int(n_samples * 0.95))
        normal_hours = np.random.randint(8, 23, int(n_samples * 0.95))
        
        # Generate anomalies
        fraud_amounts = np.random.normal(15000, 5000, int(n_samples * 0.05))
        fraud_hours = np.random.randint(1, 5, int(n_samples * 0.05))
        
        amounts = np.concatenate([normal_amounts, fraud_amounts])
        hours = np.concatenate([normal_hours, fraud_hours])
        
        df = pd.DataFrame({
            'amount': amounts,
            'hour': hours
        })
        return df

    def train_initial(self):
        print("Training initial Isolation Forest model...")
        data = self.generate_synthetic_data()
        self.iso_forest.fit(data)
        self.trained = True
        
    def predict(self, amount, hour, category=None, history=None):
        if not self.trained:
            self.train_initial()
            
        features = pd.DataFrame([[amount, hour]], columns=['amount', 'hour'])
        
        # Isolation Forest returns -1 for anomalies, 1 for normal
        decision_score = self.iso_forest.decision_function(features)[0]
        prediction = self.iso_forest.predict(features)[0]
        
        # Base risk from Isolation Forest
        risk_score = min(100, max(0, ((-decision_score + 0.3) * 150)))

        # Health Leniency: Healthcare is often expensive and critical
        if category == 'Health':
            risk_score *= 0.2 # Drastically reduce risk for Health
        
        reasons = []
        if amount > 10000:
            reasons.append("Unusually high transaction amount (ML deviation)")
        if hour < 6:
            reasons.append("Late night transaction anomaly")
            
        # Analyze history if provided
        if history and len(history) > 0:
            # Velocity check: more than 3 transactions in short time
            # Note: history items should have 'date' and 'amount'
            now_ms = pd.Timestamp.now().timestamp() * 1000
            recent = [t for t in history if (now_ms - t.get('date', 0)) < 1800000] # 30 mins
            if len(recent) > 2:
                risk_score += 20
                reasons.append("High velocity detected (multiple recent transactions)")
                
            # Average deviation
            avg_amount = np.mean([t.get('amount', 0) for t in history])
            if amount > avg_amount * 5:
                risk_score += 15
                reasons.append(f"Transaction is {amount/avg_amount:.1f}x higher than your average")

        return {
            "risk_score": int(min(100, risk_score)),
            "is_suspicious": risk_score >= 35,
            "reasons": reasons,
            "confidence": 0.92 if risk_score > 70 else 0.85
        }

model_instance = FraudModel()
