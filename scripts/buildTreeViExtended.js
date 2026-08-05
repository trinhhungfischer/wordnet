import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

// Roots from before
const existingParents = ["Từ vựng cơ bản", "Tự nhiên", "Đời sống", "Hoạt động", "Vật chất", "Giáo dục", "Nhóm Động vật", "Nhóm Thực vật", "Hiện tượng", "Ăn uống", "Tổ ấm", "Con người", "Thời trang", "Giải trí", "Xã hội", "Chất liệu", "Đồ vật", "Trường học", "Ngôn ngữ"];

// Let's create an "Từ vựng mở rộng" root for any category not in the existing tree
let extendedRoot = dict.find(c => c.name === "Từ vựng mở rộng");
if (!extendedRoot) {
    extendedRoot = {
        name: "Từ vựng mở rộng",
        parents: [],
        subcategories: [],
        popularity: 90.0,
        words: []
    };
    dict.push(extendedRoot);
}

dict.forEach(c => {
    // If it's not a root itself and has no parents, put it under "Từ vựng mở rộng"
    if (c.name !== "Từ vựng mở rộng" && c.name !== "Từ vựng cơ bản" && (!c.parents || c.parents.length === 0)) {
        if (!existingParents.includes(c.name)) {
            c.parents = ["Từ vựng mở rộng"];
            if (!extendedRoot.subcategories.includes(c.name)) {
                extendedRoot.subcategories.push(c.name);
            }
        }
    }
});

// Calculate backwards subcategories/parents just in case
dict.forEach(c => {
    if (c.subcategories) {
        c.subcategories.forEach(sub => {
            const child = dict.find(x => x.name === sub);
            if (child && !child.parents.includes(c.name)) {
                child.parents.push(c.name);
            }
        });
    }
});

fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2), 'utf8');
console.log(`Updated tree. Total categories: ${dict.length}`);
