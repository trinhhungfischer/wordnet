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

def check_word_similarity_across_categories(data, model):
    if not HAS_NLP or model is None:
        return ""
        
    categories_info = data.get('categories', [])
    if not categories_info or len(categories_info) < 2:
        return ""
    
    word_list = []
    
    for c in categories_info:
        cat_name = c.get('category')
        if not cat_name:
            continue
        words = c.get('words', [])
        for w in words:
            full_word = w.get('fullWord')
            if full_word:
                word_list.append((full_word, cat_name))
                
    if len(word_list) < 2:
        return ""
        
    texts = [item[0] for item in word_list]
    if len(texts) == 0:
        return ""
        
    embeddings = model.encode(texts)
    
    similar_pairs = []
    # threshold
    threshold = 0.75
    
    for i, j in itertools.combinations(range(len(word_list)), 2):
        word_i, cat_i = word_list[i]
        word_j, cat_j = word_list[j]
        
        # We only care about words in DIFFERENT categories
        if cat_i == cat_j:
            continue
            
        # Ignore if words are exactly the same (case-insensitive) - though this might be a bug in the level itself!
        if word_i.lower().strip() == word_j.lower().strip():
            similar_pairs.append(f"'{word_i}'({cat_i}) & '{word_j}'({cat_j}) [100% - EXACT MATCH]")
            continue
            
        sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
        if sim >= threshold:
            similar_pairs.append(f"'{word_i}'({cat_i}) & '{word_j}'({cat_j}) [{sim*100:.1f}%]")
            
    return " | ".join(similar_pairs)

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
        
        if cat_map[name_i] == name_j or cat_map[name_j] == name_i:
            continue
        if cat_map[name_i] and cat_map[name_i] == cat_map[name_j]:
            continue
            
        sim = cosine_similarity([embeddings[i]], [embeddings[j]])[0][0]
        if sim >= 0.8:
            similar_pairs.append(f"{name_i} & {name_j} ({sim*100:.1f}%)")
            
    return " | ".join(similar_pairs)

def generate_report():
    model = None
    if HAS_NLP:
        print("Loading NLP Model (SentenceTransformers)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded.")
    else:
        print("SentenceTransformers not found. Skipping similarity check.")
        
    folder = os.path.join("public", "real_levels")
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
    
    if not os.path.exists(folder):
        print(f"Folder {folder} does not exist!")
        return
        
    files = [f for f in os.listdir(folder) if f.endswith('.json')]
    
    def get_level_num(fname):
        try:
            return int(fname.replace("Level ", "").replace(".json", ""))
        except:
            return 999999
    
    files.sort(key=get_level_num)

    for filename in files:
        filepath = os.path.join(folder, filename)
            
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"Error parsing {filename}")
                continue
            
        all_word_entries = data.get('allWordEntries', [])
        entries = len(all_word_entries)
        moves = data.get('moveLimit', 0)
        difficulty = data.get('levelDifficulty', 0)
        
        active_mechanics = []
        for key, name in mechanics_map.items():
            if check_mechanic(data, key):
                active_mechanics.append(name)
                
        has_chunks = False
        for word in all_word_entries:
            chunks = word.get('chunks')
            if isinstance(chunks, list) and len(chunks) > 0:
                has_chunks = True
                break
        
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
            
        sim_words_text = check_word_similarity_across_categories(data, model)
        sim_cat_text = check_category_similarity(data, model)
                
        records.append({
            'Level': filename.replace('.json', ''),
            'Số lượng từ (entries)': entries,
            'Số bước giải (moveLimit)': moves,
            'Độ khó': difficulty,
            'Số lượng cơ chế': len(active_mechanics),
            'Cơ chế gì?': ', '.join(active_mechanics),
            'Category có nghĩa gần nhau (>80%)': sim_cat_text,
            'Từ dễ nhầm lẫn (Khác Category, >75%)': sim_words_text
        })
        
    df = pd.DataFrame(records)
    output_file = "Real_Levels_Word_Similarity_Report.xlsx"
    df.to_excel(output_file, index=False)
    print(f"Generated {output_file} successfully!")

if __name__ == "__main__":
    generate_report()
