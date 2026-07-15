const fs = require('fs');
const readline = require('readline');

// ĐƯỜNG DẪN TỚI FILE CSV VÀ DICTIONARY
const CSV_PATH = './unigram_freq.csv'; // <--- BẠN ĐỂ FILE CSV VÀO ĐÂY NHÉ
const DICT_PATH = './public/global_dictionary.json';

// CÔNG THỨC CHUẨN HÓA LOGARITHM (0 - 100)
// Từ "the" cao nhất khoảng 23 tỷ ~ log10(23 tỷ) = 10.36
// Ta lấy (log10(count) / 10.36) * 100 để scale về đúng thang 0 -> 100
const MAX_LOG = 10.36; 
function calculateScore(count) {
  if (count <= 0) return 0;
  const logScore = Math.log10(count);
  let finalScore = (logScore / MAX_LOG) * 100;
  
  // Đảm bảo điểm không lọt ra ngoài khoảng 0-100
  return Math.max(0, Math.min(100, finalScore));
}

async function run() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`LỖI: Không tìm thấy file ${CSV_PATH}. Vui lòng copy file CSV của bạn vào thư mục dự án và chạy lại!`);
    return;
  }

  console.log('Đang nạp file CSV vào bộ nhớ (có thể mất vài giây)...');
  const frequencyMap = new Map();
  
  const fileStream = fs.createReadStream(CSV_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    // Giả sử file CSV có định dạng: word,count
    const parts = line.split(',');
    if (parts.length >= 2) {
      const word = parts[0].trim().toLowerCase();
      const count = parseFloat(parts[1].trim());
      if (word && !isNaN(count)) {
        frequencyMap.set(word, count);
      }
    }
  }
  console.log(`Đã nạp xong ${frequencyMap.size.toLocaleString()} từ vựng vào bộ nhớ!`);

  console.log('Bắt đầu chấm điểm lại Dictionary bằng thuật toán Logarit...');
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));

  for (let i = 0; i < dict.length; i++) {
    const cat = dict[i];
    let totalScore = 0;
    let validWordCount = 0;

    for (let j = 0; j < cat.words.length; j++) {
      let w = cat.words[j].word.trim().toLowerCase();
      
      // Nếu là cụm từ (có dấu cách), ta lấy trung bình các chữ trong cụm, hoặc kiểm tra nguyên cụm
      let count = frequencyMap.get(w) || 0;
      
      // Nếu cụm từ ghép không có trong CSV (CSV thường chỉ có từ đơn - unigram)
      // Ta sẽ tách ra và lấy trung bình cộng tần suất các từ đơn (VD: "in bloom" = (in + bloom)/2)
      if (count === 0 && w.includes(' ')) {
        const subWords = w.split(' ');
        let subTotal = 0;
        let foundSubWords = 0;
        for (const sw of subWords) {
            const swCount = frequencyMap.get(sw);
            if (swCount) {
                subTotal += swCount;
                foundSubWords++;
            }
        }
        if (foundSubWords > 0) {
            count = subTotal / foundSubWords; // Lấy trung bình cộng tần suất thô
        }
      }

      // CHẤM ĐIỂM BẰNG LOGARITHM
      const score = calculateScore(count);
      
      // Cập nhật điểm cho từ vựng (làm tròn 2 chữ số)
      cat.words[j].popularity = parseFloat(score.toFixed(2));

      if (score > 0) {
        totalScore += score;
        validWordCount++;
      }
    }
    
    // Cập nhật điểm trung bình của cả Category
    cat.popularity = validWordCount > 0 ? parseFloat((totalScore / validWordCount).toFixed(2)) : 0;
  }

  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));
  console.log('✅ Hoàn tất! Toàn bộ điểm số đã được chuẩn hóa về thang điểm 0 - 100 tuyệt đẹp!');
}

run();
