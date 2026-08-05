import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./public/global_dictionary_vi.json', 'utf8'));

// Define the deep tree structure
const newParents = [
  { name: "Kiến thức chung", subcategories: ["Ẩm thực Việt", "Địa lý Việt Nam", "Giải trí & Nghệ thuật", "Đời sống & Tự nhiên", "Thương hiệu & Công nghệ"] },
  
  { name: "Ẩm thực Việt", subcategories: ["Món ăn chính", "Đặc sản vùng miền", "Đồ ăn nhẹ & Thức uống", "Nguyên liệu & Gia vị"] },
  { name: "Món ăn chính", subcategories: ["Món bún Việt Nam", "Món phở", "Món mì Việt Nam", "Món gỏi"] },
  { name: "Đặc sản vùng miền", subcategories: ["Đặc sản miền Tây", "Đặc sản Tây Bắc", "Đặc sản miền Trung", "Đặc sản Đà Lạt"] },
  { name: "Đồ ăn nhẹ & Thức uống", subcategories: ["Món bánh truyền thống", "Món chè", "Món ăn vặt", "Đồ uống phổ biến", "Các loại cà phê", "Các loại bánh mì"] },
  { name: "Nguyên liệu & Gia vị", subcategories: ["Các loại trái cây", "CÁC LOẠI TRÁI CÂY", "CÁC LOẠI RAU CỦ", "CÁC LOẠI GIA VỊ", "Các loại mắm", "CÁC LOẠI NẤM", "CÁC LOẠI HẠT", "CÁC LOẠI NGŨ CỐC"] },

  { name: "Địa lý Việt Nam", subcategories: ["Hành chính", "Du lịch & Cảnh quan", "Văn hóa & Lịch sử"] },
  { name: "Hành chính", subcategories: ["Các tỉnh miền Bắc", "Các tỉnh miền Trung", "Các tỉnh miền Nam", "Biển số xe các tỉnh"] },
  { name: "Du lịch & Cảnh quan", subcategories: ["Hòn đảo Việt Nam", "Bãi biển đẹp", "Vườn quốc gia", "Vịnh biển Việt Nam", "Hang động Việt Nam", "Đèo ở Việt Nam", "Dòng sông Việt Nam", "Địa điểm du lịch Sài Gòn", "Địa điểm du lịch Hà Nội"] },
  { name: "Văn hóa & Lịch sử", subcategories: ["Lễ hội truyền thống", "Di sản thế giới tại Việt Nam", "Trang phục truyền thống", "Các dân tộc Việt Nam", "Làng nghề truyền thống", "Địa danh lịch sử", "Chùa nổi tiếng", "Nhà thờ đẹp", "Trò chơi dân gian"] },

  { name: "Giải trí & Nghệ thuật", subcategories: ["Âm nhạc", "Điện ảnh & Sân khấu", "Người nổi tiếng", "Truyền thông"] },
  { name: "Âm nhạc", subcategories: ["Bài hát nhạc trẻ", "Bài hát nhạc Bolero", "Nhạc cụ dân tộc", "CÁC LOẠI NHẠC CỤ"] },
  { name: "Điện ảnh & Sân khấu", subcategories: ["Phim điện ảnh Việt", "Phim truyền hình Việt", "Nghệ sĩ cải lương", "Nghệ sĩ hài", "Rạp chiếu phim", "Hãng phim", "Giải thưởng giải trí"] },
  { name: "Người nổi tiếng", subcategories: ["Ca sĩ Vpop", "Diễn viên Việt Nam", "Đạo diễn Việt Nam", "Nhạc sĩ Việt Nam", "Rapper Việt Nam", "Ban nhạc Việt Nam", "Nhà thiết kế thời trang", "Người mẫu Việt Nam", "Cuộc thi hoa hậu", "Danh nhân văn hóa", "Vlogger Việt Nam", "Streamer Việt Nam"] },
  { name: "Truyền thông", subcategories: ["Chương trình truyền hình", "Kênh truyền hình", "Báo điện tử", "Nhà xuất bản", "Tạp chí Việt Nam"] },

  { name: "Thương hiệu & Công nghệ", subcategories: ["Giao thông & Vận tải", "Tiêu dùng & Bán lẻ", "Công nghệ & Mạng"] },
  { name: "Giao thông & Vận tải", subcategories: ["Thương hiệu xe máy", "Thương hiệu ô tô", "Hãng hàng không", "Ứng dụng gọi xe", "Ứng dụng giao hàng"] },
  { name: "Tiêu dùng & Bán lẻ", subcategories: ["Ngân hàng Việt Nam", "Hãng bia và nước giải khát", "Hãng sữa", "Thương hiệu cà phê", "Chuỗi siêu thị", "Chuỗi thức ăn nhanh", "Thương hiệu thời trang Việt"] },
  { name: "Công nghệ & Mạng", subcategories: ["Mạng xã hội", "Thương mại điện tử", "Thương hiệu viễn thông"] },

  { name: "Đời sống & Tự nhiên", subcategories: ["Đồ dùng", "Thời trang", "Tự nhiên"] },
  { name: "Đồ dùng", subcategories: ["Đồ dùng trong nhà", "Đồ dùng cá nhân & Văn phòng", "Dụng cụ"] },
  { name: "Đồ dùng trong nhà", subcategories: ["ĐỒ NỘI THẤT", "DỤNG CỤ NHÀ BẾP", "ĐỒ DÙNG NHÀ TẮM", "THIẾT BỊ CHIẾU SÁNG", "THIẾT BỊ SƯỞI ẤM", "ĐỒ GỐM SỨ", "ĐỒ ĐIỆN TỬ", "ĐỒ CHƠI TRẺ EM", "DỤNG CỤ VỆ SINH NHÀ CỬA"] },
  { name: "Đồ dùng cá nhân & Văn phòng", subcategories: ["ĐỒ DÙNG CÁ NHÂN", "ĐỒ DÙNG HỌC TẬP", "ĐỒ DÙNG VĂN PHÒNG", "DỤNG CỤ Y TẾ", "ĐỒ DÙNG DÃ NGOẠI"] },
  { name: "Dụng cụ", subcategories: ["DỤNG CỤ THỂ THAO", "DỤNG CỤ LÀM VƯỜN", "DỤNG CỤ SỬA CHỮA", "VẬT LIỆU XÂY DỰNG", "CÁC LOẠI ĐÁ QUÝ"] },
  
  { name: "Thời trang", subcategories: ["QUẦN ÁO", "PHỤ KIỆN THỜI TRANG", "CÁC LOẠI GIÀY DÉP", "CÁC LOẠI VẢI", "ĐỒ TRANG SỨC"] },
  
  { name: "Tự nhiên", subcategories: ["Động vật", "Thực vật", "Khác"] },
  { name: "Động vật", subcategories: ["TÊN LOÀI CÁ", "TÊN LOÀI CHIM", "TÊN LOÀI CÔN TRÙNG"] },
  { name: "Thực vật", subcategories: ["TÊN LOÀI HOA", "TÊN LOÀI CÂY GỖ"] },
  { name: "Khác", subcategories: ["HIỆN TƯỢNG THỜI TIẾT", "PHƯƠNG TIỆN GIAO THÔNG"] }
];

const allCatNames = data.map(c => c.name.toLowerCase());

// Append new parents
newParents.forEach(p => {
    if (!allCatNames.includes(p.name.toLowerCase())) {
        data.push({
            name: p.name,
            parents: [],
            subcategories: p.subcategories,
            popularity: 90.0,
            words: [] 
        });
    } else {
        const existing = data.find(c => c.name.toLowerCase() === p.name.toLowerCase());
        existing.subcategories = p.subcategories;
    }
});

// Update parents array
data.forEach(c => c.parents = []); 
data.forEach(c => {
    c.subcategories.forEach(sub => {
        const child = data.find(x => x.name.toLowerCase() === sub.toLowerCase());
        if (child && !child.parents.includes(c.name)) {
            child.parents.push(c.name);
        }
    });
});

fs.writeFileSync('./public/global_dictionary_vi.json', JSON.stringify(data, null, 2), 'utf8');
console.log('Tree structure built successfully. Total categories:', data.length);
