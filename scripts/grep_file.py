
import sys

filename = sys.argv[1]
search_term = sys.argv[2]

try:
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if search_term.lower() in line.lower():
                print(f"{i+1}: {line.strip()}")
except Exception as e:
    print(f"Error: {e}")
