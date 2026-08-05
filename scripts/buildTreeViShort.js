import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./public/global_dictionary_vi.json', 'utf8'));

// Deep tree for short words
const newParents = [
  { name: "Từ vựng cơ bản", subcategories: ["Tự nhiên", "Đời sống", "Hoạt động", "Vật chất", "Giáo dục"] },
  
  { name: "Tự nhiên", subcategories: ["Nhóm Động vật", "Nhóm Thực vật", "Hiện tượng"] },
  { name: "Nhóm Động vật", subcategories: ["Động vật", "Côn trùng", "Động vật biển", "Thủy hải sản", "Gia cầm", "Chim", "Cá", "Hải sản"] },
  { name: "Nhóm Thực vật", subcategories: ["Cây cối", "Hoa", "Cây", "Trái cây", "Rau củ", "Hạt ngũ", "Hạt"] },
  { name: "Hiện tượng", subcategories: ["Thời tiết", "Thiên nhiên", "Nước", "Không gian", "Biển", "Mùa vụ", "Địa hình"] },

  { name: "Đời sống", subcategories: ["Ăn uống", "Tổ ấm", "Con người", "Thời trang"] },
  { name: "Ăn uống", subcategories: ["Món ăn", "Đồ uống", "Gia vị", "Ăn nhanh", "Nấu ăn", "Thức uống", "Vị giác"] },
  { name: "Tổ ấm", subcategories: ["Nhà cửa", "Nội thất", "Gia dụng", "Bếp", "Đồ dùng"] },
  { name: "Con người", subcategories: ["Gia đình", "Bộ phận", "Cảm xúc", "Nghề nghiệp", "Nghề", "Bệnh tật", "Cơ thể", "Chức vụ"] },
  { name: "Thời trang", subcategories: ["Quần áo", "Phụ kiện", "Mỹ phẩm", "Trang sức", "Đồ mặc"] },

  { name: "Hoạt động", subcategories: ["Giải trí", "Xã hội"] },
  { name: "Giải trí", subcategories: ["Thể thao", "Đồ chơi", "Âm nhạc", "Nhạc cụ"] },
  { name: "Xã hội", subcategories: ["Phương tiện", "Xe cộ", "Tiền tệ", "Tôn giáo", "Nơi chốn"] },

  { name: "Vật chất", subcategories: ["Chất liệu", "Đồ vật"] },
  { name: "Chất liệu", subcategories: ["Vật liệu", "Kim loại", "Chất"] },
  { name: "Đồ vật", subcategories: ["Dụng cụ", "Vũ khí", "Máy móc", "Văn phòng", "Làm vườn", "Nông cụ", "Xây dựng"] },

  { name: "Giáo dục", subcategories: ["Trường học", "Ngôn ngữ"] },
  { name: "Trường học", subcategories: ["Môn học", "Đồ dùng học", "Hình học", "Học tập", "Sách vở", "Hình dạng"] },
  { name: "Ngôn ngữ", subcategories: ["Hành động", "Động từ", "Thời gian", "Vị trí", "Đặc điểm", "Số", "Đơn vị", "Kích cỡ", "Tiếng kêu"] }
];

const allCatNames = data.map(c => c.name.toLowerCase());

// Deduplicate existing categories by merging their words if names match
const uniqueDataMap = new Map();
data.forEach(c => {
    const key = c.name.toLowerCase();
    if (uniqueDataMap.has(key)) {
        const existing = uniqueDataMap.get(key);
        const existingWords = existing.words.map(w => w.word.toLowerCase());
        c.words.forEach(w => {
            if (!existingWords.includes(w.word.toLowerCase())) {
                existing.words.push(w);
            }
        });
    } else {
        uniqueDataMap.set(key, c);
    }
});
let uniqueData = Array.from(uniqueDataMap.values());

const existingKeys = uniqueData.map(c => c.name.toLowerCase());
newParents.forEach(p => {
    if (!existingKeys.includes(p.name.toLowerCase())) {
        uniqueData.push({
            name: p.name,
            parents: [],
            subcategories: p.subcategories,
            popularity: 90.0,
            words: [] 
        });
    } else {
        const existing = uniqueData.find(c => c.name.toLowerCase() === p.name.toLowerCase());
        existing.subcategories = p.subcategories;
    }
});

// Calculate parents
uniqueData.forEach(c => c.parents = []); 
uniqueData.forEach(c => {
    c.subcategories.forEach(sub => {
        const child = uniqueData.find(x => x.name.toLowerCase() === sub.toLowerCase());
        if (child && !child.parents.includes(c.name)) {
            child.parents.push(c.name);
        }
    });
});

// Recompute popularity just in case
uniqueData.forEach(c => {
   if (c.words.length > 0) {
       let sum = 0;
       c.words.forEach(w => sum += w.popularity || 50);
       c.popularity = sum / c.words.length;
   } 
});

fs.writeFileSync('./public/global_dictionary_vi.json', JSON.stringify(uniqueData, null, 2), 'utf8');
console.log('Tree structure built successfully. Total categories:', uniqueData.length);
