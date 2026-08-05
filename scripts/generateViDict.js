import fs from 'fs';
import path from 'path';

const categories = [
  {
    name: "Trái cây",
    words: [
      "táo", "lê", "mận", "đào", "nho", "bưởi", "cam", "quýt", "chuối", "dứa", 
      "xoài", "ổi", "mít", "na", "sầu riêng", "chôm chôm", "măng cụt", "dưa hấu", 
      "dưa gang", "dưa lưới", "cà chua", "đu đủ", "bơ", "dừa", "nhãn", "vải"
    ]
  },
  {
    name: "Động vật",
    words: [
      "chó", "mèo", "gà", "lợn", "heo", "bò", "trâu", "ngựa", "dê", "cừu",
      "thỏ", "chuột", "rắn", "hổ", "báo", "sư tử", "voi", "khỉ", "vượn", "hươu",
      "nai", "gấu", "cáo", "chồn", "sóc", "nhím", "cá", "tôm", "cua", "mực"
    ]
  },
  {
    name: "Chim chóc",
    words: [
      "đại bàng", "chim sẻ", "chim én", "bồ câu", "cú mèo", "chim ưng", "cò", 
      "vạc", "diệc", "hạc", "đà điểu", "chim cút", "chim trĩ", "chim công"
    ]
  },
  {
    name: "Gia đình",
    words: [
      "ông", "bà", "cha", "mẹ", "bố", "má", "anh", "chị", "em", "con",
      "cháu", "chắt", "cụ", "kỵ", "bác", "chú", "cô", "dì", "cậu", "mợ",
      "thím", "dượng", "vợ", "chồng"
    ]
  },
  {
    name: "Màu sắc",
    words: [
      "đỏ", "xanh", "vàng", "tím", "cam", "lục", "lam", "chàm", "trắng", "đen",
      "nâu", "xám", "hồng", "bạc", "đồng"
    ]
  },
  {
    name: "Nghề nghiệp",
    words: [
      "bác sĩ", "y tá", "giáo viên", "kỹ sư", "công nhân", "nông dân", 
      "thợ mộc", "thợ xây", "thợ may", "ca sĩ", "diễn viên", "nhà báo",
      "nhà văn", "phi công", "tài xế", "đầu bếp", "cảnh sát", "bộ đội"
    ]
  },
  {
    name: "Đồ gia dụng",
    words: [
      "bàn", "ghế", "giường", "tủ", "gương", "quạt", "đèn", "tivi", "tủ lạnh",
      "máy giặt", "chổi", "nồi", "chảo", "bát", "đĩa", "đũa", "thìa", "dao",
      "kéo", "thớt", "cốc", "chén", "ly", "bếp", "lò nướng"
    ]
  },
  {
    name: "Phương tiện",
    words: [
      "xe đạp", "xe máy", "ô tô", "xe buýt", "xe tải", "xe khách", "tàu hỏa",
      "máy bay", "thuyền", "tàu thủy", "phà", "xe ba gác", "xe xích lô"
    ]
  },
  {
    name: "Thời tiết",
    words: [
      "nắng", "mưa", "gió", "bão", "tuyết", "sương mù", "sấm", "sét",
      "cầu vồng", "mây", "lốc xoáy", "áp thấp", "không khí", "nhiệt độ"
    ]
  },
  {
    name: "Bộ phận cơ thể",
    words: [
      "đầu", "tóc", "mắt", "mũi", "miệng", "môi", "răng", "lưỡi", "tai",
      "cổ", "vai", "ngực", "bụng", "lưng", "tay", "chân", "ngón tay",
      "ngón chân", "móng tay", "móng chân", "đầu gối", "gót chân"
    ]
  },
  {
    name: "Môn thể thao",
    words: [
      "bóng đá", "bóng chuyền", "bóng rổ", "bầu dục", "bóng chày", "bóng bàn",
      "cầu lông", "quần vợt", "cử tạ", "bơi lội", "điền kinh", "thể dục",
      "võ thuật", "đua xe", "đua ngựa", "cờ vua", "cờ tướng"
    ]
  },
  {
    name: "Quốc gia",
    words: [
      "việt nam", "lào", "campuchia", "thái lan", "trung quốc", "nhật bản",
      "hàn quốc", "triều tiên", "mỹ", "anh", "pháp", "đức", "ý", "nga",
      "ấn độ", "brazil", "canada", "úc"
    ]
  },
  {
    name: "Hoa",
    words: [
      "hoa hồng", "hoa lan", "hoa cúc", "hoa sen", "hoa mai", "hoa đào",
      "hoa ly", "hoa huệ", "hoa dơn", "hoa súng", "hoa đồng tiền",
      "hoa hướng dương", "hoa cẩm chướng", "hoa phượng", "hoa bằng lăng"
    ]
  },
  {
    name: "Quần áo",
    words: [
      "áo sơ mi", "áo thun", "áo phông", "áo khoác", "áo len", "quần âu",
      "quần bò", "quần đùi", "váy", "đầm", "mũ", "nón", "giày", "dép",
      "ủng", "tất", "vớ", "khăn", "găng tay", "thắt lưng", "cà vạt"
    ]
  },
  {
    name: "Hành động",
    words: [
      "ăn", "uống", "ngủ", "chơi", "học", "làm", "chạy", "nhảy", "đi",
      "Đứng", "ngồi", "nằm", "cười", "khóc", "nói", "nghe", "nhìn", "đọc",
      "viết", "suy nghĩ", "hát", "múa", "vẽ"
    ]
  }
];

const globalDict = categories.map(cat => {
  return {
    name: cat.name,
    parents: [],
    subcategories: [],
    popularity: 50 + Math.random() * 40,
    words: cat.words.map(w => {
      // capital word for visual
      const upperWord = w.toUpperCase();
      return {
        word: upperWord,
        icon: null,
        popularity: 30 + Math.random() * 60,
      };
    })
  };
});

// Write to file
const outPath = './public/global_dictionary_vi.json';
fs.writeFileSync(outPath, JSON.stringify(globalDict, null, 2), 'utf8');

console.log('Successfully generated public/global_dictionary_vi.json with', globalDict.length, 'categories and spaces preserved.');
