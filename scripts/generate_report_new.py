import os
import json
import csv

def check_mechanic(data, mechanic_name):
    if mechanic_name == 'useBubbleSeparator':
        return data.get('useBubbleSeparator', 0) == 1
    
    # special case for chunk splitting which is when an entry in allWordEntries has a parentWord
    if mechanic_name == 'chunkSplitting':
        entries = data.get('allWordEntries', [])
        for e in entries:
            if e.get('parentWord'):
                return True
        return False
        
    val = data.get(mechanic_name)
    if val and isinstance(val, list) and len(val) > 0:
        return True
    return False

def generate_report():
    folder = "public/real_levels"
    records = []
    
    mechanics_map = {
        'useBubbleSeparator': 'Chain',
        'frozenBubbles': 'Frozen Bubble',
        'keyLockBubbles': 'Lock & Key',
        'burstBubbles': 'Burst Bubbles',
        'crypticBubbles': 'Cryptic/Hide Text',
        'screwLockBubbles': 'Screw Lock',
        'backwardBubbles': 'Backward Word',
        'crackedBubbles': 'Cracked Bubbles',
        'chunkSplitting': 'Chunk Splitting'
    }

    for i in range(501, 1001):
        filename = f"Level {i}.json"
        filepath = os.path.join(folder, filename)
        
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        entries = len(data.get('allWordEntries', []))
        moves = data.get('moveLimit', 0)
        difficulty = data.get('levelDifficulty', 0)
        
        active_mechanics = []
        for key, name in mechanics_map.items():
            if check_mechanic(data, key):
                active_mechanics.append(name)
                
        records.append({
            'Level': i,
            'Số lượng từ (entries)': entries,
            'Số bước giải (moveLimit)': moves,
            'Độ khó': difficulty,
            'Số lượng cơ chế': len(active_mechanics),
            'Cơ chế gì?': ', '.join(active_mechanics)
        })
        
    if not records:
        print("No files processed.")
        return
        
    keys = records[0].keys()
    out_file = "Level_Report_501_1000.csv"
    with open(out_file, "w", newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(records)
        
    print(f"Generated {out_file}")

if __name__ == "__main__":
    generate_report()
