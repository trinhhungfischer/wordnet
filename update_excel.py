import openpyxl
import sys

sys.stdout.reconfigure(encoding='utf-8')
file_path = 'E:/3HP-Project/wordnet tool/024-Bubble.xlsx'

try:
    wb = openpyxl.load_workbook(file_path)
    sheet = wb['Main gameplay']
    
    new_text = "Khi merge được 1 chữ ( từ 2 từ ghép nửa) sẽ rơi thêm 1 bubble mới, merge 4 bóng thành 1 category mới (tức có 1 bóng category mới trên sân) thì chỉ rơi thêm 3 bóng cho đủ max bubble, merge 2 từ vào 1 category thì không drop thêm gì"
    
    found = False
    for row in sheet.iter_rows():
        for cell in row:
            if cell.value and isinstance(cell.value, str) and "merge được 1 category sẽ thêm 4 bubble" in cell.value:
                print(f"Found at {cell.coordinate}: {cell.value}")
                cell.value = new_text
                found = True
                
    if found:
        wb.save(file_path)
        print("Updated Excel file successfully.")
    else:
        print("Could not find the target text in the sheet.")

except Exception as e:
    print(f"Error: {e}")
