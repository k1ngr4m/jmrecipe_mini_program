// utils/base64-image.js

/**
 * 检查字符串是否为base64格式的图片数据
 * @param {string} str - 待检查的字符串
 * @returns {boolean} - 是否为base64图片数据
 */
function isBase64Image(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') && str.includes('base64,');
}

/**
 * 从base64图片数据中提取纯base64字符串
 * @param {string} base64Data - base64图片数据
 * @returns {string} - 纯base64字符串
 */
function extractBase64String(base64Data) {
  if (!isBase64Image(base64Data)) return base64Data;
  return base64Data.split('base64,')[1];
}

/**
 * 将base64字符串转换为临时文件路径
 * @param {string} base64Data - base64图片数据
 * @param {function} callback - 回调函数，接收临时文件路径
 */
function base64ToTempFilePath(base64Data, callback) {
  if (!base64Data) {
    callback('');
    return;
  }

  // 如果不是base64图片数据，直接返回原数据
  if (!isBase64Image(base64Data)) {
    callback(base64Data);
    return;
  }

  try {
    // 提取纯base64字符串
    const base64Str = extractBase64String(base64Data);
    
    // 获取文件管理器
    const fsm = wx.getFileSystemManager();
    
    // 生成临时文件路径
    const filePath = `${wx.env.USER_DATA_PATH}/temp_image_${Date.now()}.png`;
    
    // 将base64写入临时文件
    fsm.writeFile({
      filePath: filePath,
      data: base64Str,
      encoding: 'base64',
      success: () => {
        callback(filePath);
      },
      fail: (err) => {
        console.error('base64转临时文件失败:', err);
        callback('');
      }
    });
  } catch (error) {
    console.error('base64转换异常:', error);
    callback('');
  }
}

/**
 * 批量处理base64图片数据
 * @param {Array} outfitList - 穿搭列表
 * @param {function} callback - 回调函数，接收处理后的列表
 */
function processBase64Images(outfitList, callback) {
  if (!Array.isArray(outfitList) || outfitList.length === 0) {
    callback(outfitList);
    return;
  }

  // 复制数组以避免修改原数组
  const processedList = [...outfitList];
  let processedCount = 0;
  const totalCount = outfitList.length;

  // 处理每个穿搭项的图片
  processedList.forEach((outfit, index) => {
    if (outfit.image_url && isBase64Image(outfit.image_url)) {
      base64ToTempFilePath(outfit.image_url, (tempFilePath) => {
        if (tempFilePath) {
          processedList[index].image_url = tempFilePath;
        }
        processedCount++;
        
        // 如果所有项都处理完成，调用回调函数
        if (processedCount === totalCount) {
          console.log('处理base64图片完成:', processedList);
          callback(processedList);
        }
      });
    } else {
      processedCount++;
      
      // 如果所有项都处理完成，调用回调函数
      if (processedCount === totalCount) {
        console.log('处理base64图片完成:', processedList);
        callback(processedList);
      }
    }
  });
}

module.exports = {
  isBase64Image,
  extractBase64String,
  base64ToTempFilePath,
  processBase64Images
};