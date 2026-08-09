import json
import os
import shutil
import sys

def validate_venues_json(json_path: str):
    print(f"[BUILD] Checking venues database file: {json_path}")
    if not os.path.exists(json_path):
        print(f"[ERROR] File not found: {json_path}")
        sys.exit(1)
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not isinstance(data, list):
        print("[ERROR] venues.json must be a JSON array of venue objects")
        sys.exit(1)
        
    required_keys = ["id", "name", "category", "time_tags", "price_range", "capacity", "address", "city", "ward", "lat", "lng", "tags", "rating"]
    for idx, item in enumerate(data):
        for key in required_keys:
            if key not in item:
                print(f"[ERROR] Item #{idx} ({item.get('name', 'Unknown')}) missing required key '{key}'")
                sys.exit(1)
                
    print(f"[SUCCESS] Successfully validated {len(data)} venues in database!")

def sync_to_web_data(source_path: str, target_dir: str):
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, "venues.json")
    shutil.copy2(source_path, target_path)
    print(f"[BUILD] Synced venues database to web directory: {target_path}")

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    venues_path = os.path.join(base_dir, "src", "data", "venues.json")
    web_data_dir = os.path.join(base_dir, "src", "web", "data")
    
    validate_venues_json(venues_path)
    sync_to_web_data(venues_path, web_data_dir)

if __name__ == "__main__":
    main()
