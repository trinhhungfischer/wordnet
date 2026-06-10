import os
import json
import pandas as pd

def check_mechanic(data, mechanic_name):
    if mechanic_name == 'useBubbleSeparator':
        return data.get('useBubbleSeparator', 0) == 1
    
    val = data.get(mechanic_name)
    if val and isinstance(val, list) and len(val) > 0:
        return True
    return False

def generate_report():
    folder = "level_configs"
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
        'linkedBubbles': 'Linked Bubbles'
    }

    for i in range(0, 1001):
        filename = f"Level {i}.json"
        filepath = os.path.join(folder, filename)
        
        if not os.path.exists(filepath):
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        all_word_entries = data.get('allWordEntries', [])
        entries = len(all_word_entries)
        moves = data.get('moveLimit', 0)
        difficulty = data.get('levelDifficulty', 0)
        
        active_mechanics = []
        for key, name in mechanics_map.items():
            if check_mechanic(data, key):
                active_mechanics.append(name)
                
        # Check for Chunk mechanics (cắt từ thành chunk)
        has_chunks = False
        for word in all_word_entries:
            chunks = word.get('chunks')
            if isinstance(chunks, list) and len(chunks) > 0:
                has_chunks = True
                break
        
        # If not found in allWordEntries, check in categories just in case
        if not has_chunks:
            for cat in data.get('categories', []):
                for word in cat.get('words', []):
                    chunks = word.get('chunks')
                    if isinstance(chunks, list) and len(chunks) > 0:
                        has_chunks = True
                        break
                if has_chunks:
                    break
                    
        if has_chunks:
            active_mechanics.append('Cắt từ (Chunks)')
                
        records.append({
            'Level': i,
            'Số lượng từ (entries)': entries,
            'Số bước giải (moveLimit)': moves,
            'Độ khó': difficulty,
            'Số lượng cơ chế': len(active_mechanics),
            'Cơ chế gì?': ', '.join(active_mechanics)
        })
        
    df = pd.DataFrame(records)
    df.to_excel("Level_Report.xlsx", index=False)
    print("Generated Level_Report.xlsx successfully with Chunks mechanic!")

if __name__ == "__main__":
    generate_report()
