const config = require('../../config/api.js');

Page({
  data: {
    clothing: null,
    isLoading: true
  },

  onLoad: function (options) {
    const clothingId = options.id;
    if (clothingId) {
      this.getClothingDetail(clothingId);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
    }
  },

  // 获取带签名的COS图片URL
  getSignedCosUrl: function(cosUrl, callback) {
    // 如果URL已经包含签名信息，则直接返回
    if (cosUrl && cosUrl.includes('q-sign-algorithm')) {
      callback(cosUrl);
      return;
    }
    
    // 如果不是COS URL，则直接返回
    if (!cosUrl || !cosUrl.includes('.cos.')) {
      callback(cosUrl);
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
    const key = match[3]; // clothing/1754496891594_6800.png
    
    // 引入COS凭证管理器
    const cosCredentialsManager = require('../../utils/cos-credentials-manager.js');
    const COS = require('../../utils/cos-wx-sdk-v5.js');
    
    // 获取有效的凭证
    cosCredentialsManager.getValidCredentials().then(credentials => {
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
        }
      });
      
      // 获取带签名的URL
      cos.getObjectUrl({
        Bucket: bucketWithAppId,
        Region: region,
        Key: key,
        Sign: true
      }, function(err, data) {
        if (err) {
          console.error('获取签名URL失败:', err);
          callback(cosUrl); // 如果获取失败，返回原始URL
        } else {
          callback(data.Url);
        }
      });
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      callback(cosUrl); // 如果获取失败，返回原始URL
    });
  },

  // 获取服装详情
  getClothingDetail: function (clothingId) {
    wx.request({
      url: config.getFullURL('clothing') + '/detail?user_id=1',
      method: 'POST',
      data: {
        clothing_id: parseInt(clothingId)
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const clothing = res.data;
          
          // 如果有图片URL，则获取带签名的URL
          if (clothing.image_url) {
            this.getSignedCosUrl(clothing.image_url, (signedUrl) => {
              clothing.image_url = signedUrl;
              this.setData({
                clothing: clothing,
                isLoading: false
              });
            });
          } else {
            this.setData({
              clothing: clothing,
              isLoading: false
            });
          }
        } else if (res.statusCode === 404) {
          wx.showToast({
            title: '衣物不存在',
            icon: 'none'
          });
          wx.navigateBack();
        } else {
          wx.showToast({
            title: '获取详情失败',
            icon: 'none'
          });
          wx.navigateBack();
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        wx.navigateBack();
      }
    });
  }
});