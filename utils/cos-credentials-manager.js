const config = require('../config/api.js');

class COSCredentialsManager {
  constructor() {
    this.credentials = null;
    this.expiredTime = 0;
  }

  // 检查凭证是否有效
  isCredentialsValid() {
    if (!this.credentials || !this.expiredTime) {
      return false;
    }
    
    // 提前5分钟过期，避免边界问题
    const bufferTime = 5 * 60 * 1000;
    const now = Date.now();
    
    return now < (this.expiredTime * 1000 - bufferTime);
  }

  // 获取缓存的凭证
  getCachedCredentials() {
    if (this.isCredentialsValid()) {
      return this.credentials;
    }
    return null;
  }

  // 设置凭证
  setCredentials(credentials) {
    this.credentials = credentials;
    this.expiredTime = credentials.expired_time || 0;
  }

  // 从服务器获取新的凭证
  async fetchNewCredentials() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: config.getFullURL('cosCredentials'),
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200 && res.data.tmp_secret_id) {
            this.setCredentials(res.data);
            resolve(res.data);
          } else {
            reject(new Error('获取COS凭证失败: ' + (res.data.message || res.statusCode)));
          }
        },
        fail: (err) => {
          reject(new Error('网络错误: ' + err.errMsg));
        }
      });
    });
  }

  // 获取有效的凭证（先检查缓存，如果无效则重新获取）
  async getValidCredentials() {
    // 首先检查缓存的凭证是否有效
    const cachedCredentials = this.getCachedCredentials();
    if (cachedCredentials) {
      return cachedCredentials;
    }

    // 如果缓存无效，则获取新的凭证
    try {
      const newCredentials = await this.fetchNewCredentials();
      return newCredentials;
    } catch (error) {
      throw error;
    }
  }
}

// 创建单例实例
const cosCredentialsManager = new COSCredentialsManager();

module.exports = cosCredentialsManager;