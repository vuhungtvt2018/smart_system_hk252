from api.database.session import engine
from api.database.model import Base, CustomerPrediction
import sqlalchemy as sa

def reset_prediction_table():
    print("Attempting to reset 'customer_predictions' table schema...")
    inspector = sa.inspect(engine)
    
    if "customer_predictions" in inspector.get_table_names():
        print("Table exists. Dropping it to sync with new schema...")
        CustomerPrediction.__table__.drop(engine)
        print("Table dropped.")
    
    print("Recreating table with new schema...")
    CustomerPrediction.__table__.create(engine)
    print("Table 'customer_predictions' recreated successfully with all 19 feature columns.")

if __name__ == "__main__":
    reset_prediction_table()
