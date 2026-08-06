import json
import time
from deep_translator import GoogleTranslator

input_file = "scratch/full_translation/chunk_7.json"
output_file = "scratch/full_translation/chunk_7_vi.json"

print(f"Loading data from {input_file}...")
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

translator = GoogleTranslator(source='en', target='vi')

strings_to_translate = []
for item in data:
    if item['n'] not in strings_to_translate:
        strings_to_translate.append(item['n'])
    for word in item['w']:
        if word not in strings_to_translate:
            strings_to_translate.append(word)

print(f"Found {len(strings_to_translate)} unique strings to translate.")

batch_size = 40
translated_strings = []

for i in range(0, len(strings_to_translate), batch_size):
    batch = strings_to_translate[i:i+batch_size]
    print(f"Translating batch {i // batch_size + 1}/{(len(strings_to_translate) + batch_size - 1) // batch_size}...")
    try:
        batch_res = translator.translate_batch(batch)
        translated_strings.extend(batch_res)
    except Exception as e:
        print(f"Error at batch {i}: {e}. Retrying one by one...")
        for text in batch:
            try:
                res = translator.translate(text)
                translated_strings.append(res)
            except Exception as ex:
                print(f"Failed to translate '{text}': {ex}")
                translated_strings.append(text)
    time.sleep(0.5)

translation_map = dict(zip(strings_to_translate, translated_strings))

for item in data:
    if item['n'] in translation_map:
        item['n'] = translation_map[item['n']]
    new_w = []
    for w in item['w']:
        if w in translation_map:
            new_w.append(translation_map[w])
        else:
            new_w.append(w)
    item['w'] = new_w

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Translation completed successfully.")
