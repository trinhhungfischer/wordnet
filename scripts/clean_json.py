import os
import json
import glob

# Paths to clean
paths = [
    'E:/3HP-Project/wordnet tool/level_configs/*.json',
    'E:/3HP-Project/wordnet tool/public/levels/*.json',
    'E:/3HP-Project/thp024/Assets/_Game/Resources/LevelJSon/*.json'
]

garbage_keys = [
    'hasSeperator',
    'hasCrypticBubbles', 'minMaxCrypticBubbles',
    'hasBurstBubbles', 'minMaxBurstBubbles',
    'hasBackwardBubbles', 'minMaxBackwardBubbles',
    'hasFrozenBubbles', 'minMaxFrozenBubbles',
    'hasKeyLockBubbles', 'minMaxKeyLockBubbles',
    'hasScrewLockBubbles', 'minMaxScrewLockBubbles',
    'hasCrackBubbles', 'minMaxCrackBubbles',
    'hasLinkedBubbles', 'minMaxLinkedBubbles'
]

files_modified = 0

for path_pattern in paths:
    for file_path in glob.glob(path_pattern):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            modified = False
            for key in garbage_keys:
                if key in data:
                    del data[key]
                    modified = True
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                files_modified += 1
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

print(f"Cleaned garbage keys from {files_modified} JSON files.")
