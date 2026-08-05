const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'src', 'data', 'global_dictionary.json');
const outputPath = path.join(__dirname, 'word_dependencies.csv');

// Đọc file JSON
console.log(`Đang đọc file: ${inputPath}...`);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// 1. Tạo bảng tra cứu Popularity cho tất cả các node (Từ và Danh mục)
const popularityMap = {};

data.forEach(category => {
    // Lưu popularity của Category
    if (category.popularity !== undefined) {
        popularityMap[category.name] = category.popularity;
    }
    
    // Lưu popularity của các Từ (Words)
    if (Array.isArray(category.words)) {
        category.words.forEach(wordObj => {
            if (wordObj.popularity !== undefined) {
                popularityMap[wordObj.word] = wordObj.popularity;
            }
        });
    }
});

// 2. Tạo danh sách các mối liên kết (Edges)
const edges = [];
// Cột CSV
edges.push('Source,Target,Source_Popularity,Target_Popularity');

// Hàm để escape chuỗi trong CSV (nếu có dấu phẩy hoặc ngoặc kép)
function escapeCSV(str) {
    if (str == null) return '';
    str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

data.forEach(category => {
    const source = category.name;
    const sourcePop = popularityMap[source] || '';

    // Liên kết Category -> Subcategory
    if (Array.isArray(category.subcategories)) {
        category.subcategories.forEach(subcat => {
            const targetPop = popularityMap[subcat] || '';
            edges.push(`${escapeCSV(source)},${escapeCSV(subcat)},${sourcePop},${targetPop}`);
        });
    }

    // Liên kết Category -> Word
    if (Array.isArray(category.words)) {
        category.words.forEach(wordObj => {
            const target = wordObj.word;
            const targetPop = wordObj.popularity || popularityMap[target] || '';
            edges.push(`${escapeCSV(source)},${escapeCSV(target)},${sourcePop},${targetPop}`);
        });
    }
});

// Ghi ra file CSV
console.log(`Đang ghi file CSV: ${outputPath}...`);
fs.writeFileSync(outputPath, edges.join('\n'), 'utf8');
console.log(`Hoàn thành! Đã tạo file với ${edges.length - 1} liên kết (edges).`);
