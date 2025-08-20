const app = getApp();
const COS = require('../../../utils/cos-wx-sdk-v5.js');
const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');
const config = require('../../../config/api.js');

Page({
  data: {
    userInfo: {},
    tempAvatarUrl: '',
    tempNickname: '',
    tempCity: '',
    tempProvince: '',
    tempCountry: '',
    tempBirthday: '',
    tempPhone: '',
    birthdayDisplay: '', // 用于显示的日期字符串
    genderIndex: 0,
    genderOptions: ['未知', '男', '女']
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    
    if (userInfo) {
      // 如果生日是时间戳，直接使用；如果是日期字符串，转换为时间戳
      let birthdayValue = '';
      let birthdayDisplay = '';
      if (userInfo.birthday) {
        if (typeof userInfo.birthday === 'number') {
          // 如果已经是时间戳，直接使用
          birthdayValue = userInfo.birthday;
          // 转换为显示用的日期字符串
          birthdayDisplay = new Date(userInfo.birthday * 1000).toISOString().slice(0, 10);
        } else if (typeof userInfo.birthday === 'string' && !isNaN(userInfo.birthday)) {
          // 如果是数字字符串，转换为数字
          birthdayValue = parseInt(userInfo.birthday);
          // 转换为显示用的日期字符串
          birthdayDisplay = new Date(parseInt(userInfo.birthday) * 1000).toISOString().slice(0, 10);
        } else {
          // 如果是日期字符串，转换为时间戳
          birthdayValue = Math.floor(new Date(userInfo.birthday).getTime() / 1000);
          // 直接使用日期字符串作为显示
          birthdayDisplay = userInfo.birthday;
        }
      }
      
      // 处理头像URL，如果有的话需要验签
      if (userInfo.avatarUrl) {
        this.getSignedCosUrl(userInfo.avatarUrl, (signedUrl) => {
          // 更新用户信息，使用验签后的URL
          const updatedUserInfo = {
            ...userInfo,
            avatarUrl: signedUrl
          };
          
          this.setData({
            userInfo: updatedUserInfo,
            tempNickname: userInfo.nickName || '',
            tempCity: userInfo.city || '',
            tempProvince: userInfo.province || '',
            tempCountry: userInfo.country || '',
            tempBirthday: birthdayValue,
            birthdayDisplay: birthdayDisplay,
            tempPhone: userInfo.phone || '',
            genderIndex: userInfo.gender || 0
          });
        });
      } else {
        this.setData({
          userInfo: userInfo,
          tempNickname: userInfo.nickName || '',
          tempCity: userInfo.city || '',
          tempProvince: userInfo.province || '',
          tempCountry: userInfo.country || '',
          tempBirthday: birthdayValue,
          birthdayDisplay: birthdayDisplay,
          tempPhone: userInfo.phone || '',
          genderIndex: userInfo.gender || 0
        });
      }
    }
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 获取COS签名URL
  getSignedCosUrl: function(cosUrl, callback) {
    // 如果URL已经包含签名信息，则直接返回
    if (cosUrl && cosUrl.includes('q-sign-algorithm')) {
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
    const key = match[3]; // clothing-list/1754496891594_6800.png
    const bucket = bucketWithAppId; // COS SDK可以处理带APPID的bucket名称
    
    // 引入COS SDK和凭证管理器
    const COS = require('../../../utils/cos-wx-sdk-v5.js');
    const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');
    
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
        },
        SimpleUploadMethod: 'putObject'
      });
      
      // 获取带签名的URL
      cos.getObjectUrl({
        Bucket: bucket,
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

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          tempAvatarUrl: tempFilePath
        });
        
        // 上传头像到COS
        wx.showToast({
          title: '正在上传头像...',
          icon: 'loading'
        });
        
        this.uploadAvatarToCOS(tempFilePath, (cosUrl) => {
          console.log('头像上传完成:', cosUrl);
          wx.showToast({
            title: '头像上传成功',
            icon: 'success'
          });
        });
      },
      fail: (err) => {
        console.error('选择头像失败', err);
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 上传头像到腾讯云COS（带回调）
  uploadAvatarToCOS(filePath, callback) {
    console.log('开始上传头像到COS:', filePath);
    const that = this;
    const userid = this.data.userInfo.userid || wx.getStorageSync('userid') || 'unknown';
    
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
        },
        SimpleUploadMethod: 'putObject'
      });
      
      // 生成唯一文件名
      const fileName = filePath.split('/').pop();
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const ext = fileName.split('.').pop();
      const key = `jmrecipe/avatar/${userid}_${timestamp}_${random}.${ext}`;
      
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
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        } else {
          console.log('上传成功', data);
          const cosUrl = `https://${data.Location}`;
          
          // 更新头像URL
          that.setData({
            tempAvatarUrl: cosUrl
          });
          
          if (callback && typeof callback === 'function') {
            callback(cosUrl);
          }
        }
      });
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      wx.showToast({
        title: '获取上传凭证失败',
        icon: 'none'
      });
    });
  },

  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    });
  },

  onCityInput(e) {
    this.setData({
      tempCity: e.detail.value
    });
  },

  onProvinceInput(e) {
    this.setData({
      tempProvince: e.detail.value
    });
  },

  onCountryInput(e) {
    this.setData({
      tempCountry: e.detail.value
    });
  },

  onBirthdayChange(e) {
    // 将日期字符串转换为秒级时间戳
    const dateStr = e.detail.value;
    const timestamp = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : '';
    this.setData({
      tempBirthday: timestamp,
      birthdayDisplay: dateStr
    });
  },

  onPhoneInput(e) {
    this.setData({
      tempPhone: e.detail.value
    });
  },

  onGenderChange(e) {
    this.setData({
      genderIndex: e.detail.value
    });
  },

  saveProfile() {
    const { tempAvatarUrl, tempNickname, tempCity, tempProvince, tempCountry, tempBirthday, tempPhone, genderIndex, userInfo } = this.data;
    const app = getApp();
    const config = require('../../../config/api.js');
    
    // 如果有新头像且是本地文件路径，需要先上传到COS
    if (tempAvatarUrl && (tempAvatarUrl.startsWith('http://tmp') || tempAvatarUrl.startsWith('/'))) {
      wx.showToast({
        title: '正在上传头像...',
        icon: 'loading'
      });
      
      this.uploadAvatarToCOS(tempAvatarUrl, (cosUrl) => {
        // 上传完成后更新头像URL并提交用户信息
        this.setData({
          tempAvatarUrl: cosUrl
        });
        
        // 调用提交用户信息的函数
        this.submitUserInfo(cosUrl);
      });
    } else {
      // 如果头像已经是COS URL或没有更改头像，直接提交用户信息
      this.submitUserInfo(tempAvatarUrl);
    }
  },
  
  // 提交用户信息到后端接口
  submitUserInfo(avatarUrl) {
    const { tempNickname, tempCity, tempProvince, tempCountry, tempBirthday, tempPhone, genderIndex, userInfo } = this.data;
    const app = getApp();
    const config = require('../../../config/api.js');
    
    // 昵称必填验证
    if (!tempNickname || tempNickname.trim() === '') {
      wx.showToast({
        title: '昵称为必填项',
        icon: 'none'
      });
      return;
    }
    
    // 更新用户信息
    const updatedUserInfo = {
      ...userInfo,
      nickName: tempNickname !== undefined ? tempNickname : (userInfo.nickName || ''),
      city: tempCity || userInfo.city,
      province: tempProvince || userInfo.province,
      country: tempCountry || userInfo.country,
      birthday: tempBirthday || userInfo.birthday,
      phone: tempPhone || userInfo.phone,
      gender: genderIndex
    };
    
    // 如果有新头像，更新头像URL
    if (avatarUrl) {
      updatedUserInfo.avatarUrl = avatarUrl;
    }
    
    // 构造请求数据，符合接口要求
    const requestData = {
      userid: userInfo.userid || wx.getStorageSync('userid') || '',
      nickname: tempNickname !== undefined ? tempNickname : (userInfo.nickName || ''),
      avatar_url: avatarUrl || userInfo.avatarUrl || '',
      gender: genderIndex,
      language: userInfo.language || 'zh_cn',
      birthday: tempBirthday || userInfo.birthday || '',
      city: tempCity || userInfo.city || '',
      province: tempProvince || userInfo.province || '',
      country: tempCountry || userInfo.country || '',
      phone: tempPhone || userInfo.phone || ''
    };
    
    // 调用后端接口更新用户信息
    wx.request({
      url: config.getFullURL('user') + '/update',
      method: 'POST',
      data: requestData,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          // 接口调用成功，更新全局数据和本地存储
          app.globalData.userInfo = updatedUserInfo;
          wx.setStorageSync('userInfo', updatedUserInfo);
          
          // 返回到个人资料页面并刷新
          wx.navigateBack({
            delta: 1,
            success: () => {
              // 通知前页面刷新数据
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2];
              if (prevPage && typeof prevPage.onShow === 'function') {
                prevPage.onShow();
              }
            }
          });
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.msg || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('更新用户信息失败', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
});