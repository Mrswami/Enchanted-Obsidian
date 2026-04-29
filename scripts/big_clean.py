import os
import re
from collections import defaultdict
import shutil
import time

VAULT_DIR = r"C:\Users\freem\OneDrive\Documents\EnchantedObsidian"
TRASH_DIR = os.path.join(VAULT_DIR, ".trash")

if not os.path.exists(TRASH_DIR):
    os.makedirs(TRASH_DIR)

def get_source_data(filepath):
    """Extracts Source URL and link ID from file content."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for Gemni links: g.co/gemini/share/abcdefg or gemini.google.com/share/abcdefg
            url_match = re.search(r'https?://(g\.co/gemini/share/|gemini\.google\.com/share/)(\w+)', content)
            if url_match:
                return url_match.group(0), url_match.group(2), content
    except Exception as e:
        print(f"// Error reading {filepath}: {e}")
    return None, None, None

def big_clean():
    print(f"// INITIATING SOVEREIGN SWEEP: {VAULT_DIR}")
    files = [f for f in os.listdir(VAULT_DIR) if f.endswith('.md')]
    
    # Map of ID -> list of (filepath, content)
    id_map = defaultdict(list)
    
    for filename in files:
        filepath = os.path.join(VAULT_DIR, filename)
        url, link_id, content = get_source_data(filepath)
        
        # Also try to extract ID from filename if content fails (e.g. empty file)
        if not link_id:
            # Pattern: GEMINI_..._ID.md or GEMINI_TITLE_ID.md
            id_from_name = re.search(r'_([a-z0-9]{10,20})\.md$', filename)
            if id_from_name:
                link_id = id_from_name.group(1)
        
        if link_id:
            id_map[link_id].append((filepath, content or ""))

    results = []

    for link_id, occurrences in id_map.items():
        if len(occurrences) > 1:
            print(f"// Found {len(occurrences)} nodes for ID: {link_id}")
            
            # Sort by content length (descending) to find the 'Master' node
            occurrences.sort(key=lambda x: len(x[1]), reverse=True)
            master_path, master_content = occurrences[0]
            fragments = occurrences[1:]
            
            merged_count = 0
            for frag_path, frag_content in fragments:
                # If fragment has content not in master, append it
                if frag_content and frag_content not in master_content:
                    with open(master_path, 'a', encoding='utf-8') as f:
                        f.write(f"\n\n--- MERGED FROM FRAGMENT: {os.path.basename(frag_path)} ---\n\n")
                        f.write(frag_content)
                    print(f"//   - Merged {os.path.basename(frag_path)} -> {os.path.basename(master_path)}")
                
                # Move fragment to trash
                trash_name = f"{int(time.time())}_{os.path.basename(frag_path)}"
                shutil.move(frag_path, os.path.join(TRASH_DIR, trash_name))
                merged_count += 1
            
            results.append(f"Merged {merged_count} fragments for ID: {link_id}")

    print("// SOVEREIGN SWEEP COMPLETE.")
    return results

if __name__ == "__main__":
    results = big_clean()
    if not results:
        print("// Result: No conceptual duplicates found.")
    else:
        for res in results:
            print(f"// {res}")
