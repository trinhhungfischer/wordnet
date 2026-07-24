import os
import json
import pandas as pd
import itertools
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_NLP = True
except ImportError:
    HAS_NLP = False

def check_mechanic(data, mechanic_name):
    if mechanic_name == 'useBubbleSeparator':
        return data.get('useBubbleSeparator', 0) == 1
    
    val = data.get(mechanic_name)
    if val and isinstance(val, list) and len(val) > 0:
        return True
    return False

def check_category_similarity(data, model):
    if not HAS_NLP or model is None:
        return ""
        
    categories_info = data.get('categories', [])
    if not categories_info or len(categories_info) < 2:
        return ""
    
    cat_names = []
    cat_map = {}
    
    for c in categories_info:
        name = c.get('category')
        if not name:
            continue
        cat_names.append(name)
        cat_map[name] = c.get('parentCategory')
        
    if len(cat_names) < 2:
        return ""
        
    embeddings = model.encode(cat_names)
    
    similar_pairs = []
    for i, j in itertools.combinations(range(len(cat_names)), 2):
        name_i = cat_names[i]
        name_j = cat_names[j]
        
        # Bỏ qua nếu có quan hệ cha con
        if cat_map[name_i] == name_j or cat_map[name_j] == name_i:
            continue
            
        # Bỏ qua nếu cùng chung một parent (và parent đó không null)
        if cat_map[name_i] and cat_map[name_i] == cat_map[name_j]:
            continue
            
        sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
        if sim >= 0.8:
            similar_pairs.append(f"{name_i} & {name_j} ({sim*100:.1f}%)")
            
    return " | ".join(similar_pairs)

def generate_report():
    model = None
    if HAS_NLP:
        print("Loading NLP Model (SentenceTransformers) - This may take a moment...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded.")
    else:
        print("SentenceTransformers not found. Skipping similarity check. Run 'pip install sentence-transformers scikit-learn'.")
        
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
            
        # Kiểm tra trùng lặp nghĩa category
        sim_text = check_category_similarity(data, model)
                
        records.append({
            'Level': i,
            'Số lượng từ (entries)': entries,
            'Số bước giải (moveLimit)': moves,
            'Độ khó': difficulty,
            'Số lượng cơ chế': len(active_mechanics),
            'Cơ chế gì?': ', '.join(active_mechanics),
            'Category có nghĩa gần nhau (>80%)': sim_text
        })
        
    df = pd.DataFrame(records)
    df.to_csv("Level_Report.csv", index=False, encoding='utf-8-sig')
    print("Generated Level_Report.csv successfully!")

if __name__ == "__main__":
    generate_report()
