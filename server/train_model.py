import sys
import os

# Ensure we can import the module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_logic import model_instance

def train_and_save():
    print("=== Training Fraud Detection Model ===")
    
    # Force re-training
    print("Training model on synthetic data...")
    model_instance.train_initial()
    
    # Save the trained model
    print("Saving model to disk...")
    model_instance.save_model()
    
    print("\n[✓] Training Complete.")
    print("The model has been saved and will be loaded automatically on server restart.")

if __name__ == "__main__":
    train_and_save()
