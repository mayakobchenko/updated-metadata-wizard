import sys
import json

if len(sys.argv) > 1:
    json_file_path = sys.argv[1]
else:
    print(json.dumps({"error": "No metadata JSON file path provided."}))
    sys.exit(1)

try:
    with open(json_file_path, 'r') as json_file:
        data = json.load(json_file)
        dataset1 = data['dataset1']
        dataset1_title = dataset1['dataTitle']
        print(json.dumps(
            {"message": "Successfully read JSON", "data title": dataset1_title}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
