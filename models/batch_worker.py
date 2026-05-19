import sys
import os
import argparse
import logging

# Add the project root to sys.path so we can import 'api'
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from api.database.session import SessionLocal
from api.services.prediction_service import execute_batch_inference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Batch Inference Worker")
    parser.add_argument("--job_id", type=int, required=True, help="Batch Job ID")
    parser.add_argument("--file_path", type=str, required=True, help="Path to the uploaded CSV file")
    
    args = parser.parse_args()
    
    logger.info(f"Starting batch inference for job {args.job_id} on file {args.file_path}")
    
    db = SessionLocal()
    try:
        execute_batch_inference(db, args.job_id, args.file_path)
        logger.info(f"Batch inference completed for job {args.job_id}")
    except Exception as e:
        logger.error(f"Error executing batch inference for job {args.job_id}: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
