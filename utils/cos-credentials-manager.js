const config = require('../config/api.js');
const imageCacheManager = require('./image-cache-manager.js');
const {request} = require("./request");

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
    
    // 提前10分钟过期，避免边界问题
    const bufferTime = 10 * 60 * 1000;
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
      request({
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

  // 获取带签名的COS图片URL
  getSignedCosUrl(cosUrl, callback) {
    // 如果URL已经包含签名信息，则直接返回
    if (cosUrl && cosUrl.includes('q-sign-algorithm')) {
      callback(cosUrl);
      return;
    }
    
    // 检查缓存中是否已有签名URL
    const cachedUrl = imageCacheManager.getCachedImageUrl(cosUrl);
    if (cachedUrl) {
      callback(cachedUrl);
      return;
    }
    
    // 从URL中提取Bucket、Region和Key信息
    // URL格式: https://jmrecipe-1309147067.cos.ap-shanghai.myqcloud.com/jmrecipe/clothing/1754496891594_6800.png
    const urlPattern = /^https:\/\/([^\/]+)\.cos\.([^\/]+)\.myqcloud\.com\/(.+)$/;
    const match = cosUrl.match(urlPattern);
    
    if (!match) {
      console.error('无效的COS URL格式:', cosUrl);
      callback(cosUrl);
      return;
    }
    
    const bucketWithAppId = match[1]; // jmrecipe-1309147067
    const region = match[2]; // ap-shanghai
    const key = match[3]; // clothing-list/1754496891594_6800.png
    const bucket = bucketWithAppId; // COS SDK可以处理带APPID的bucket名称
    
    // 引入COS SDK
    const COS = require('./cos-wx-sdk-v5.js');
    
    // 获取有效的凭证
    this.getValidCredentials().then(credentials => {
      // 初始化COS实例
      const cos = new COS({
        getAuthorization: function (options, callback) {
          callback({
            TmpSecretId: credentials.tmp_secret_id,
            TmpSecretKey: credentials.tmp_secret_key,
            SecurityToken: credentials.token,
            StartTime: credentials.start_time,
            ExpiredTime: credentials.expired_time
          });
        },
        SimpleUploadMethod: 'putObject'
      });
      
      // 获取带签名的URL
      cos.getObjectUrl({
        Bucket: bucket,
        Region: region,
        Key: key,
        Sign: true
      }, (err, data) => {
        if (err) {
          console.error('获取签名URL失败:', err);
          callback(cosUrl); // 如果获取失败，返回原始URL
        } else {
          // 将签名URL存入缓存
          imageCacheManager.setCachedImageUrl(cosUrl, data.Url);
          callback(data.Url);
        }
      });
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      callback(cosUrl); // 如果获取失败，返回原始URL
    });
  }

  // 批量获取带签名的COS图片URL
  getBatchSignedCosUrls(cosUrls, callback) {
    // 过滤无效URL并检查缓存
    const validUrls = cosUrls.filter(url => url);
    const results = {};
    let pendingCount = validUrls.length;
    
    // 如果没有有效的URL，直接返回
    if (pendingCount === 0) {
      callback(results);
      return;
    }
    
    // 先检查缓存
    validUrls.forEach(cosUrl => {
      // 如果URL已经包含签名信息，则直接使用
      if (cosUrl.includes('q-sign-algorithm')) {
        results[cosUrl] = cosUrl;
        pendingCount--;
        return;
      }
      
      // 检查缓存中是否已有签名URL
      const cachedUrl = imageCacheManager.getCachedImageUrl(cosUrl);
      if (cachedUrl) {
        results[cosUrl] = cachedUrl;
        pendingCount--;
      }
    });
    
    // 如果所有URL都已经缓存，直接返回
    if (pendingCount === 0) {
      callback(results);
      return;
    }
    
    // 获取有效的凭证
    this.getValidCredentials().then(credentials => {
      // 引入COS SDK
      const COS = require('./cos-wx-sdk-v5.js');
      
      // 初始化COS实例
      const cos = new COS({
        getAuthorization: function (options, callback) {
          callback({
            TmpSecretId: credentials.tmp_secret_id,
            TmpSecretKey: credentials.tmp_secret_key,
            SecurityToken: credentials.token,
            StartTime: credentials.start_time,
            ExpiredTime: credentials.expired_time
          });
        },
        SimpleUploadMethod: 'putObject'
      });
      
      // 处理未缓存的URL
      validUrls.forEach(cosUrl => {
        // 跳过已处理的URL
        if (results[cosUrl]) return;
        
        // 从URL中提取Bucket、Region和Key信息
        const urlPattern = /^https:\/\/([^\/]+)\.cos\.([^\/]+)\.myqcloud\.com\/(.+)$/;
        const match = cosUrl.match(urlPattern);
        
        if (!match) {
          console.error('无效的COS URL格式:', cosUrl);
          results[cosUrl] = cosUrl;
          pendingCount--;
          if (pendingCount === 0) {
            callback(results);
          }
          return;
        }
        
        const bucketWithAppId = match[1]; // jmrecipe-1309147067
        const region = match[2]; // ap-shanghai
        const key = match[3]; // clothing-list/1754496891594_6800.png
        const bucket = bucketWithAppId; // COS SDK可以处理带APPID的bucket名称
        
        // 获取带签名的URL
        cos.getObjectUrl({
          Bucket: bucket,
          Region: region,
          Key: key,
          Sign: true
        }, (err, data) => {
          if (err) {
            console.error('获取签名URL失败:', err);
            results[cosUrl] = cosUrl; // 如果获取失败，返回原始URL
          } else {
            // 将签名URL存入缓存
            imageCacheManager.setCachedImageUrl(cosUrl, data.Url);
            results[cosUrl] = data.Url;
          }
          
          pendingCount--;
          if (pendingCount === 0) {
            callback(results);
          }
        });
      });
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      // 如果获取凭证失败，返回原始URL
      validUrls.forEach(cosUrl => {
        if (!results[cosUrl]) {
          results[cosUrl] = cosUrl;
        }
      });
      callback(results);
    });
  }

  // 初始化COS实例
  initCosInstance(credentials) {
    // 引入COS SDK
    const COS = require('./cos-wx-sdk-v5.js');
    
    // 初始化COS实例
    const cos = new COS({
      getAuthorization: function (options, callback) {
        callback({
          TmpSecretId: credentials.tmp_secret_id,
          TmpSecretKey: credentials.tmp_secret_key,
          SecurityToken: credentials.token,
          StartTime: credentials.start_time,
          ExpiredTime: credentials.expired_time
        });
      },
      SimpleUploadMethod: 'putObject'
    });
    
    return cos;
  }

  // 上传文件到腾讯云COS
  uploadFileToCOS(filePath, key, callback) {
    console.log('开始上传文件到COS:', filePath);
    
    // 获取有效的凭证
    this.getValidCredentials().then(credentials => {
      // 初始化COS实例
      const cos = this.initCosInstance(credentials);
      
      // 使用SDK上传
      cos.uploadFile({
        Bucket: 'jmrecipe-1309147067',
        Region: 'ap-shanghai',
        Key: key,
        FilePath: filePath,
        onProgress: function(info) {
          console.log('上传进度:', JSON.stringify(info));
        }
      }, function(err, data) {
        if (err) {
          console.error('上传失败:', err);
          callback(err, null);
        } else {
          console.log('上传成功', data);
          const cosUrl = `https://${data.Location}`;
          callback(null, cosUrl);
        }
      });
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      callback(error, null);
    });
  }

  // 上传图片到腾讯云COS
  uploadImageToCOS(filePath, key, callback) {
    // 上传图片和上传文件使用相同的方法
    this.uploadFileToCOS(filePath, key, callback);
  }

  // 上传头像到腾讯云COS
  uploadAvatarToCOS(filePath, userid, callback) {
    // 生成唯一文件名
    const fileName = filePath.split('/').pop();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = fileName.split('.').pop();
    const key = `jmrecipe/avatar/${userid}_${timestamp}_${random}.${ext}`;
    
    // 调用通用上传函数
    this.uploadFileToCOS(filePath, key, callback);
  }
}

// 创建单例实例
const cosCredentialsManager = new COSCredentialsManager();

module.exports = cosCredentialsManager;