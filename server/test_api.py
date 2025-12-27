import requests
import time

def test_ml_service():
    url = "http://localhost:8000/score"
    
    # Normal transaction
    payload_normal = {
        "amount": 250,
        "description": "Lunch at Canteen",
        "timestamp": time.time() * 1000,
        "category": "Food",
        "history": []
    }
    
    # Anomalous transaction
    payload_fraud = {
        "amount": 75000,
        "description": "Casino Venture",
        "timestamp": time.time() * 1000,
        "category": "Social Life",
        "history": []
    }
    
    # High Health transaction (should be low risk now)
    payload_health = {
        "amount": 15000,
        "description": "Hospital Surgery",
        "timestamp": time.time() * 1000,
        "category": "Health",
        "history": []
    }
    
    print("Testing ML Service...")
    
    try:
        r1 = requests.post(url, json=payload_normal)
        print(f"Normal Transaction Score: {r1.json()['risk_score']} (Suspicious: {r1.json()['is_suspicious']})")
        
        r2 = requests.post(url, json=payload_fraud)
        print(f"Fraud Transaction Score: {r2.json()['risk_score']} (Suspicious: {r2.json()['is_suspicious']})")
        
        r3 = requests.post(url, json=payload_health)
        print(f"Health Transaction Score (15k): {r3.json()['risk_score']} (Suspicious: {r3.json()['is_suspicious']})")
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_ml_service()
