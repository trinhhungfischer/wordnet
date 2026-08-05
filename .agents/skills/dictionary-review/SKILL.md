---
name: dictionary-review
description: Audits a generated game dictionary JSON for quality, identifying and fixing meaningless words, malformed categories, and rule violations.
---

# Dictionary Reviewer Skill

## Context
When generating large vocabularies for word puzzle games via LLMs, the data often contains "junk" artifacts:
- Meaningless single syllables (e.g., "Xi", "Nhan", "Gia", "Tiếng", "Sự").
- Words that still contain classifier prefixes (e.g., "Quả Dưa Hấu" instead of "Dưa Hấu", "Con Chó" instead of "Chó").
- Malformed lengths (words that are too long to fit in puzzle boards).
- Capitalization errors (not Title Case).

## Objective
Your goal is to act as a **Quality Assurance Agent** for the dictionary file (e.g., `global_dictionary_vi.json`). You will systematically scan the dictionary, flag violations, and propose or apply fixes.

## Review Rules
1. **Meaningfulness Rule**: Every word MUST make sense as an independent noun, verb, or adjective in the context of its category. Reject single syllables that are just parts of a larger compound word (e.g., reject "Tốc" and "Độ" in favor of "Tốc Độ").
2. **Classifier Noun Rule**: Words must NOT start with generic classifiers if the category implies them. Flag words starting with "Con", "Cái", "Chiếc", "Quả", "Trái", "Cây", "Bức", "Thịt", "Món", "Sự" (unless it's an exception where dropping it destroys the meaning).
3. **Length Constraints**: Words should be between 2 and 16 characters (1 to 3 syllables). Flag any words exceeding 16 characters.
4. **Formatting**: All words must be Title Case.

## Workflow
1. **Load Data**: Read the target JSON dictionary file using file reading tools. (If the file is too large, write a Node.js script to chunk or scan it).
2. **Scripted Sweep**: Write and execute a Node.js script that automatically filters out the most obvious junk words (length < 2, or exact match with known junk like ["Tiếng", "Sự", "Cái"]).
3. **Semantic Audit**: Write a script to extract random samples of categories, or categories with high concentrations of short words, and output them for your visual review.
4. **Fixing**: Use a Node.js script to modify the JSON (delete bad words, merge split words, strip prefixes) and save the file.
5. **Report**: Output a markdown summary of how many words were deleted, how many were modified, and general health metrics of the dictionary.
