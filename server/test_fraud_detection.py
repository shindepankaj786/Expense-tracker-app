import sys
import os
import pandas as pd
import numpy as np

# Add current directory to path so we can import model_logic
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_logic import FraudModel

def run_checks():
    print("=== Testing Fraud Detection Logic (Way 1: Server ML) ===\n")
    
    # Initialize Model
    model = FraudModel()
    
    if model.trained:
        print("[✓] Model loaded from disk successfully")
    else:
        print("[!] Model not found on disk, training fresh...")
        model.train_initial()

    tests = [
        {
            "name": "Normal Transaction",
            "amount": 500,
            "hour": 14, # 2 PM
            "category": "Food",
            "expect_suspicious": False
        },
        {
            "name": "High Value Fraud",
            "amount": 25000,
            "hour": 14,
            "category": "Electronics",
            "expect_suspicious": True
        },
        {
            "name": "Late Night Anomaly",
            "amount": 2000,
            "hour": 3, # 3 AM
            "category": "Ent",
            "expect_suspicious": True
        },
        {
            "name": "Health Exception (High Amount but Valid)",
            "amount": 15000,
            "hour": 10,
            "category": "Health",
            "expect_suspicious": False # Should be lenient
        }
    ]

    print(f"\nRunning {len(tests)} scenarios...\n")
    print(f"{'SCENARIO':<30} | {'SCORE':<5} | {'SUSP?':<5} | {'RESULT':<10}")
    print("-" * 65)

    for case in tests:
        result = model.predict(case['amount'], case['hour'], case['category'])
        is_suspicious = result['is_suspicious']
        score = result['risk_score']
        
        # Determine pass/fail
        passed = is_suspicious == case['expect_suspicious']
        status = "PASS" if passed else "FAIL"
        
        print(f"{case['name']:<30} | {score:<5} | {str(is_suspicious):<5} | {status:<10}")
        if not passed:
            print(f"  -> Reasons: {result['reasons']}")

    print("\n=== Test Complete ===")

if __name__ == "__main__":
    run_checks()
