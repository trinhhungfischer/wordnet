import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    xl = pd.ExcelFile('E:/3HP-Project/wordnet tool/024-Bubble.xlsx')
    print('Sheets:', xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f'\n--- Sheet: {sheet} ---')
        print(df.to_csv(index=False))
except Exception as e:
    print('Error:', e)
