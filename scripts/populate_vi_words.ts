import fs from 'fs';
import path from 'path';

// Load the Vietnamese locales file
const viLocalesPath = path.resolve('public/locales/vi.json');
const viLocalesContent = fs.readFileSync(viLocalesPath, 'utf-8');
const viLocales = JSON.parse(viLocalesContent);
const categoriesMap = viLocales.categories || {};

const categoryDefinitions = [
  {
    englishKey: 'Animals', // maps to 'Động Vật'
    fallbackName: 'Động Vật',
    words: [
      // 1 syllable
      'chó', 'mèo', 'gà', 'vịt', 'heo', 'cáo', 'chim', 'chuột', 'bò', 'trâu', 'khỉ', 'rắn', 'Gấu',
      // 2-3 syllables (từ ghép)
      'sư tử', 'cá sấu', 'hươu cao cổ', 'tê giác', 'hà mã', 'chim cánh cụt', 'đà điểu', 'cá mập', 'sao biển',
      // Từ láy
      'bươm bướm', 'chuồn chuồn', 'đom đóm', 'châu chấu', 'cào cào', 've sầu', 'thằn lằn', 'bìm bịp'
    ]
  },
  {
    englishKey: 'Fruit', // maps to 'Trái Cây'
    fallbackName: 'Trái Cây',
    words: [
      // 1 syllable
      'cam', 'quýt', 'bưởi', 'mận', 'mơ', 'lê', 'xoài', 'nhãn', 'dừa', 'thơm', 'dứa', 'chuối', 'ổi',
      // 2 syllables (từ ghép)
      'sầu riêng', 'măng cụt', 'vú sữa', 'thanh long', 'dưa hấu', 'đu đủ', 'bơ sáp', 'nhãn lồng',
      // Từ láy / ghép có tính tượng hình
      'bòn bon', 'chôm chôm', 'mãng cầu', 'la ghim', 'hồng quân'
    ]
  },
  {
    englishKey: 'Weather', // maps to 'Thời Tiết'
    fallbackName: 'Thời Tiết',
    words: [
      // 1 syllable
      'mưa', 'nắng', 'gió', 'bão', 'tuyết', 'sương', 'mây', 'rét', 'nóng',
      // 2 syllables
      'râm mát', 'oi bức', 'nóng nực', 'lạnh lẽo', 'ấm áp', 'sấm sét', 'giông bão', 'gió lốc', 'sương mù',
      // Từ láy
      'lâm râm', 'lất phất', 'rả rích', 'tầm tã', 'ào ào', 'xầm xì', 'heo may', 'âm u', 'lành lạnh'
    ]
  },
  {
    englishKey: 'Colors', // maps to 'Danh Sách Màu Sắc' hoặc 'Các Màu Sắc'
    fallbackName: 'Màu Sắc',
    words: [
      // 1 syllable
      'xanh', 'đỏ', 'tím', 'vàng', 'đen', 'trắng', 'nâu', 'cam', 'xám', 'hồng',
      // 2 syllables
      'xanh lá', 'xanh dương', 'xanh biển', 'đỏ tươi', 'vàng chanh', 'hồng đào', 'trắng bóc', 'đen thui', 'tím lịm',
      // Từ láy/miêu tả
      'đo đỏ', 'trăng trắng', 'xam xám', 'vàng vọt', 'xanh xao', 'tím rịm', 'lờ mờ', 'đen đúa', 'sặc sỡ'
    ]
  },
  {
    englishKey: 'Vehicle', // maps to 'Phương Tiện Giao Thông'
    fallbackName: 'Phương Tiện Giao Thông',
    words: [
      // 1 syllable
      'xe', 'tàu', 'phà', 'ghe', 'đò', 'bè', 'thuyền', 'cảng',
      // 2 syllables
      'xe máy', 'xe đạp', 'ô tô', 'xe hơi', 'máy bay', 'tàu hỏa', 'tàu thủy', 'xe buýt', 'xe tải', 'xe khách',
      // Ghép / vay mượn
      'tàu ngầm', 'trực thăng', 'khinh khí cầu', 'xe cứu thương', 'xe xích lô', 'ca nô', 'du thuyền', 'xe lu'
    ]
  },
  {
    englishKey: 'Shapes', // maps to 'Hình Dạng'
    fallbackName: 'Hình Dạng',
    words: [
      // 1 syllable
      'vuông', 'tròn', 'méo', 'bẹt', 'cong', 'thẳng', 'dài', 'ngắn',
      // 2-3 syllables
      'hình vuông', 'hình tròn', 'hình chóp', 'hình trụ', 'hình thoi', 'lục giác', 'bát giác', 'tam giác',
      // Từ láy / tính từ miêu tả
      'ngoằn ngoèo', 'gồ ghề', 'bằng phẳng', 'quanh co', 'khúc khuỷu', 'vuông vắn', 'tròn trịa', 'méo mó'
    ]
  },
  {
    englishKey: 'Job', // maps to 'Công Việc'
    fallbackName: 'Nghề Nghiệp',
    words: [
      // 1 syllable
      'thợ', 'thầy', 'cô', 'y', 'bác', 'tướng', 'lính', 'sếp',
      // 2 syllables
      'giáo viên', 'bác sĩ', 'kỹ sư', 'y tá', 'công nhân', 'nông dân', 'tài xế', 'luật sư', 'kế toán', 'ca sĩ',
      // 3 syllables / ghép
      'lập trình viên', 'thợ xây dựng', 'tiếp viên hàng không', 'doanh nhân', 'nhà báo', 'đạo diễn', 'nhiếp ảnh gia'
    ]
  },
  {
    englishKey: 'Emotions',
    fallbackName: 'Cảm Xúc',
    words: [
      // 1 syllable
      'vui', 'buồn', 'giận', 'hờn', 'tủi', 'ghen', 'sợ', 'chán', 'sầu', 'lo',
      // 2 syllables
      'sung sướng', 'hạnh phúc', 'đau khổ', 'bực tức', 'lo lắng', 'sợ hãi', 'bực bội', 'phấn khích',
      // Từ láy
      'xót xa', 'nghẹn ngào', 'bứt rứt', 'hồi hộp', 'háo hức', 'bồn chồn', 'thấp thỏm', 'ray rứt', 'bâng khuâng'
    ]
  },
  {
    englishKey: 'Clothing',
    fallbackName: 'Quần Áo',
    words: [
      // 1 syllable
      'áo', 'quần', 'mũ', 'nón', 'giày', 'dép', 'tất', 'vớ', 'khăn', 'dây',
      // 2 syllables
      'áo khoác', 'sơ mi', 'quần đùi', 'quần jean', 'váy đầm', 'đồng hồ', 'găng tay', 'khăn quàng', 'nón lá',
      // Ghép / Láy
      'lụng thụng', 'chật chội', 'rộng rãi', 'cà vạt', 'dây nịt', 'áo măng tô', 'xuề xòa', 'chỉnh tề'
    ]
  },
  {
    englishKey: 'Sports',
    fallbackName: 'Thể Thao',
    words: [
      // 1 syllable
      'bơi', 'chạy', 'nhảy', 'lặn', 'đá', 'chuyền', 'ném', 'đánh', 'bắn',
      // 2 syllables
      'bóng đá', 'bóng chuyền', 'bóng rổ', 'cầu lông', 'quần vợt', 'bóng bàn', 'điền kinh', 'cờ vua', 'thể dục',
      // 3 syllables / Từ láy miêu tả hành động
      'bóng bầu dục', 'trượt băng', 'cử tạ', 'trượt ván', 'nhào lộn', 'thoăn thoắt', 'nhịp nhàng', 'dẻo dai'
    ]
  }
];

const result = categoryDefinitions.map(def => {
  let categoryName = def.fallbackName;
  if (categoriesMap[def.englishKey]) {
    categoryName = categoriesMap[def.englishKey];
  }
  return {
    name: categoryName,
    words: def.words
  };
});

const outputPath = path.resolve('temp_vi_categories_input.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

console.log(`Generated ${result.length} categories with diverse Vietnamese words.`);
console.log(`Saved to ${outputPath}`);
