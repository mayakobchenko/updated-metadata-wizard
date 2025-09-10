import sys
import json
import fairgraph
from fairgraph import KGClient

# 3this needs to be my personal token
# kg_client = KGClient(token, host="core.kg.ebrains.eu")


# Get the path of the JSON file from command line arguments
if len(sys.argv) > 1:
    json_file_path = sys.argv[1]
else:
    print(json.dumps({"error": "No JSON file path provided."}))
    sys.exit(1)

try:
    with open(json_file_path, 'r') as json_file:
        data = json.load(json_file)

        # Response
        print(json.dumps({"message": "Successfully read JSON", "data": data}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
    sys.exit(1)
