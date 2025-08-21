const md5 = require('./md5.js');

// 生成请求头si的函数
function generateSiHeader() {
  // 获取当前时间戳（秒级）
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // appid（需要根据实际情况设置）
  const appid = 'jmrecipe'; // 微信小程序appid

  // 计算md5(timestamp+appid)
  const innerMd5 = md5(timestamp + appid);
  // 计算md5(md5(timestamp+appid)+timestamp)
  const si = md5(innerMd5 + timestamp);
  return {
    si,
    timestamp
  };
}

// 封装的网络请求函数
function request(options) {
  // 生成si请求头
  const res = generateSiHeader();
  const { si, timestamp } = res;
  // 如果没有提供header，创建一个空对象
  if (!options.header) {
    options.header = {};
  }
  
  // 添加si请求头
  options.header['si'] = si;
  options.header['timestamp'] = timestamp;

  // 调用原生的wx.request
  return wx.request(options);
}

module.exports = {
  request,
  generateSiHeader
};