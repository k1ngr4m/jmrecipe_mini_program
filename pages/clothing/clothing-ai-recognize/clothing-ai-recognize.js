const COS = require('../../../utils/cos-wx-sdk-v5.js');
const config = require('../../../config/api.js');

Page({
  data: {
    title: 'AI识别添加衣物',
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    isRecognized: false, // 是否已识别
    name: '',
    primaryCategory: '', // 一级分类ID
    secondaryCategory: '', // 二级分类ID
    primaryCategoryName: '', // 一级分类名称
    secondaryCategoryName: '', // 二级分类名称
    color: '',
    season: '',
    brand: '',
    size: '', // 尺码
    brandList: [], // 品牌列表
    brandIndex: -1, // 品牌选择索引
    price: '',
    purchaseDate: '',
    // 分类数据
    primaryCategories: [], // 一级分类
    secondaryCategories: [], // 二级分类
    // 颜色和季节选项
    colorOptions: ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '黑色', '白色','卡其色','米色','粉色','棕色'],
    seasonOptions: ['春', '夏', '秋', '冬'],
    colorIndex: -1, // 颜色选择索引
    seasonIndex: -1, // 季节选择索引
    // 成员相关数据
    selectedMemberId: null,
    memberGender: 1, // 成员性别，1男/2女
    // COS实例
    cosInstance: null
  },

  onLoad() {
    // 页面加载时检查用户登录状态
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    if (!hasLoggedIn) {
      // 如果用户未登录，显示登录提示
      wx.showModal({
        title: '提示',
        content: '请先登录以使用衣橱功能',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          // 点击确定后返回上一页
          wx.navigateBack()
        }
      })
    } else {
      // 获取选中的成员信息
      this.getSelectedMemberInfo();
      
      // 获取分类数据和品牌列表
      this.getCategories();
      this.getBrandList();
    }
  },

  // 获取选中的成员信息
  getSelectedMemberInfo: function() {
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    const members = wx.getStorageSync('members') || [];
    const selectedMember = members.find(m => m.memberid === selectedMemberId);
    
    let memberGender = 1; // 默认为男
    if (selectedMember) {
      // 根据实际的性别字段进行判断
      if (selectedMember.gender === 2 || selectedMember.gender === '2') {
        memberGender = 2;
      } else if (selectedMember.gender === 1 || selectedMember.gender === '1') {
        memberGender = 1;
      } else if (selectedMember.gender === '女') {
        memberGender = 2;
      } else if (selectedMember.gender === '男') {
        memberGender = 1;
      }
    }
    
    this.setData({
      selectedMemberId: selectedMemberId,
      memberGender: memberGender
    });
  },

  // 获取品牌列表
  getBrandList: function() {
    wx.request({
      url: config.getFullURL('clothing') + '/brands/list',
      method: 'POST',
      data: {
        familyid: wx.getStorageSync('familyid') || '',
        // 添加时间戳防止缓存
        _t: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          this.setData({
            brandList: res.data.result || []
          });
        } else {
          console.log('获取品牌列表失败');
        }
      },
      fail: () => {
        console.log('获取品牌列表网络错误');
      }
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          imageUrl: tempFilePaths[0],
          isRecognized: false, // 重新选择图片时重置识别状态
          name: '',
          primaryCategory: '',
          secondaryCategory: '',
          primaryCategoryName: '',
          secondaryCategoryName: '',
          color: '',
          season: '',
          brand: '',
          size: '',
          brandIndex: -1,
          price: '',
          purchaseDate: ''
        });
        
        console.log('选择的图片路径:', tempFilePaths[0]);
      }
    });
  },

  // AI识别图片
  recognizeImage() {
    console.log('recognizeImage function called');
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '正在识别...',
      icon: 'loading'
    });
    
    // 先上传图片到COS获取URL
    console.log('开始上传图片到COS');
    this.uploadImageToCOS(this.data.imageUrl, (cosUrl) => {
      console.log('图片上传完成，开始调用AI识别接口', cosUrl);
      // 调用AI识别接口
      this.callAIRecognizeAPI(cosUrl);
    });
  },

  // 调用AI识别接口
  callAIRecognizeAPI(imageUrl) {
    console.log('callAIRecognizeAPI function called', imageUrl);
    // 获取带签名的COS图片URL
    this.getSignedCosUrl(imageUrl, (signedImageUrl) => {
      wx.request({
        url: config.getFullURL('clothing') + '/analyze',
        method: 'POST',
        data: {
          image_url: signedImageUrl,
          familyid: wx.getStorageSync('familyid') || '',
          gender: this.data.memberGender
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.success) {
            const result = res.data.data;
              
            // 如果返回了新的image_url，则下载并上传到COS替换之前的图片
            if (result.image_url) {
              this.downloadAndUploadImage(result.image_url, (newCosUrl) => {
                // 更新页面数据
                this.setData({
                  isRecognized: true,
                  name: result.name || '',
                  primaryCategory: result.primary_category || '',
                  secondaryCategory: result.secondary_category || '',
                  color: result.color || '',
                  season: result.season || '',
                  cosImageUrl: newCosUrl, // 使用新上传的图片URL
                  // 获取分类名称
                  primaryCategoryName: this.getCategoryNameById(result.primary_category, this.data.primaryCategories),
                  secondaryCategoryName: this.getCategoryNameById(result.secondary_category, this.data.secondaryCategories)
                });
                
                // 设置分类索引以便在选择器中正确显示
                const primaryCategoryIndex = this.data.primaryCategories.findIndex(c => String(c.id) === String(result.primary_category));
                const secondaryCategoryOptions = this.getCurrentSecondaryCategories(result.primary_category);
                const secondaryCategoryIndex = secondaryCategoryOptions.findIndex(c => String(c.id) === String(result.secondary_category));
                
                // 设置颜色索引
                const colorIndex = this.data.colorOptions.indexOf(result.color);
                
                // 设置季节索引
                const seasonIndex = this.data.seasonOptions.indexOf(result.season);
                
                this.setData({
                  primaryCategoryIndex: primaryCategoryIndex >= 0 ? primaryCategoryIndex : -1,
                  secondaryCategoryIndex: secondaryCategoryIndex >= 0 ? secondaryCategoryIndex : -1,
                  secondaryCategoryOptions: secondaryCategoryOptions,
                  colorIndex: colorIndex >= 0 ? colorIndex : -1,
                  seasonIndex: seasonIndex >= 0 ? seasonIndex : -1
                });
                
                wx.showToast({
                  title: '识别成功',
                  icon: 'success'
                });
              });
            } else {
              // 根据识别结果更新页面数据
              this.setData({
                isRecognized: true,
                name: result.name || '',
                primaryCategory: result.primary_category || '',
                secondaryCategory: result.secondary_category || '',
                color: result.color || '',
                season: result.season || '',
                // 获取分类名称
                primaryCategoryName: this.getCategoryNameById(result.primary_category, this.data.primaryCategories),
                secondaryCategoryName: this.getCategoryNameById(result.secondary_category, this.data.secondaryCategories)
              });
              
              // 设置分类索引以便在选择器中正确显示
              const primaryCategoryIndex = this.data.primaryCategories.findIndex(c => String(c.id) === String(result.primary_category));
              const secondaryCategoryOptions = this.getCurrentSecondaryCategories(result.primary_category);
              const secondaryCategoryIndex = secondaryCategoryOptions.findIndex(c => String(c.id) === String(result.secondary_category));
              
              // 设置颜色索引
              const colorIndex = this.data.colorOptions.indexOf(result.color);
              
              // 设置季节索引
              const seasonIndex = this.data.seasonOptions.indexOf(result.season);
              
              this.setData({
                primaryCategoryIndex: primaryCategoryIndex >= 0 ? primaryCategoryIndex : -1,
                secondaryCategoryIndex: secondaryCategoryIndex >= 0 ? secondaryCategoryIndex : -1,
                secondaryCategoryOptions: secondaryCategoryOptions,
                colorIndex: colorIndex >= 0 ? colorIndex : -1,
                seasonIndex: seasonIndex >= 0 ? seasonIndex : -1
              });
              
              wx.showToast({
                title: '识别成功',
                icon: 'success'
              });
            }
          } else {
            wx.showToast({
              title: res.data.message || '识别失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('AI识别失败:', err);
          wx.showToast({
            title: '识别失败，请重试',
            icon: 'none'
          });
        },
      });
    });
  },
  // 获取带签名的COS图片URL
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
    
    // 初始化COS实例
    this.initCosInstance().then(cos => {
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
      console.error('初始化COS实例失败:', error);
      callback(cosUrl); // 如果获取失败，返回原始URL
    });
  },
  
  // 初始化COS实例
  initCosInstance: function() {
    // 如果已经有COS实例，则直接返回
    if (this.data.cosInstance) {
      return Promise.resolve(this.data.cosInstance);
    }
    
    // 引入COS凭证管理器
    const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');
    const COS = require('../../../utils/cos-wx-sdk-v5.js');
    
    // 获取有效的凭证
    return cosCredentialsManager.getValidCredentials().then(credentials => {
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
      
      // 缓存COS实例
      this.setData({
        cosInstance: cos
      });
      
      return cos;
    });
  },

  // 获取分类数据
  getCategories() {
    wx.request({
      url: config.getFullURL('categories') + '/list',
      method: 'POST',
      data: {
        familyid: wx.getStorageSync('familyid') || '',
        gender: this.data.memberGender, // 传递性别参数，1男/2女
        // 添加时间戳防止缓存
        _t: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const primary = res.data.filter(c => c.level === 1);
          const secondary = res.data.filter(c => c.level === 2);
          this.setData({
            primaryCategories: primary,
            secondaryCategories: secondary
          });
        } else {
          console.error('获取分类数据失败', res);
        }
      },
      fail: (err) => {
        console.error('获取分类数据网络错误', err);
      }
    });
  },

  // 上传图片到腾讯云COS（带回调）
  uploadImageToCOS(filePath, callback) {
    console.log('开始上传图片到COS（使用SDK）:', filePath);
    const that = this;
    
    // 引入COS凭证管理器
    const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');
    
    // 获取有效的凭证（会自动检查缓存，避免重复调用）
    cosCredentialsManager.getValidCredentials().then(credentials => {
      // 执行上传
      this.performUpload(filePath, credentials, callback);
    }).catch(error => {
      console.error('获取COS凭证失败:', error);
      wx.showToast({
        title: '获取上传凭证失败',
        icon: 'none'
      });
    });
  },
  
  // 执行图片上传到COS
  performUpload(filePath, credentials, callback) {
    const that = this;
    
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
    const key = `jmrecipe/clothing/${timestamp}_${random}.${ext}`;
    
    // 使用SDK上传
    cos.uploadFile({
      Bucket: credentials.bucket,
      Region: credentials.region,
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
        that.setData({
          cosImageUrl: cosUrl
        });
        wx.showToast({
          title: '图片上传成功',
          icon: 'success'
        });
        if (callback && typeof callback === 'function') {
          callback(cosUrl);
        }
      }
    });
  },

  // 输入事件处理
  onNameInput: function(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onPriceInput: function(e) {
    this.setData({
      price: e.detail.value
    });
  },

  bindDateChange: function(e) {
    this.setData({
      purchaseDate: e.detail.value
    });
  },

  // 品牌选择改变事件
  onBrandChange: function(e) {
    const brandIndex = e.detail.value;
    const brand = this.data.brandList[brandIndex];
    this.setData({
      brandIndex: brandIndex,
      brand: brand ? brand.name : ''
    });
  },

  
  onPrimaryCategoryChange: function(e) {
    const primaryCategoryIndex = e.detail.value;
    const primaryCategory = this.data.primaryCategories[primaryCategoryIndex];
    
    // 获取当前一级分类下的二级分类选项
    const secondaryCategoryOptions = this.getCurrentSecondaryCategories(primaryCategory ? primaryCategory.id : '');
    
    this.setData({
      primaryCategoryIndex: primaryCategoryIndex,
      primaryCategory: primaryCategory ? primaryCategory.id : '',
      secondaryCategory: '', // 重置二级分类
      secondaryCategoryIndex: -1, // 重置二级分类索引
      secondaryCategoryOptions: secondaryCategoryOptions // 更新二级分类选项
    });
  },
  
  onSecondaryCategoryChange: function(e) {
    const secondaryCategoryIndex = e.detail.value;
    const secondaryCategory = this.data.secondaryCategoryOptions[secondaryCategoryIndex];
    
    this.setData({
      secondaryCategoryIndex: secondaryCategoryIndex,
      secondaryCategory: secondaryCategory ? secondaryCategory.id : ''
    });
  },
  
  onColorChange: function(e) {
    const colorIndex = e.detail.value;
    const color = this.data.colorOptions[colorIndex];
    this.setData({
      colorIndex: colorIndex,
      color: color
    });
  },
  
  onSeasonChange: function(e) {
    const seasonIndex = e.detail.value;
    const season = this.data.seasonOptions[seasonIndex];
    this.setData({
      seasonIndex: seasonIndex,
      season: season
    });
  },
  
  onBrandInput: function(e) {
    this.setData({
      brand: e.detail.value
    });
  },
  
  onSizeInput: function(e) {
    this.setData({
      size: e.detail.value
    });
  },
  
  // 提交表单
  handleSubmit() {
    console.log('提交事件触发');
    
    // 验证必填字段
    if (!this.data.name) {
      wx.showToast({
        title: '请填写衣物名称',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.primaryCategory) {
      wx.showToast({
        title: '缺少一级分类信息',
        icon: 'none'
      });
      return;
    }
    
    // 构造表单数据
    const formData = {
      name: this.data.name,
      primary_category: this.data.primaryCategory,
      secondary_category: this.data.secondaryCategory,
      color: this.data.color || '',
      brand: this.data.brand || '',
      size: this.data.size || '',
      season: this.data.season || '',
      price: this.data.price || '',
      purchase_date: this.data.purchaseDate || '',
      image_url: this.data.cosImageUrl || this.data.imageUrl || ''
    };
    
    console.log('提交的数据:', formData);
    
    // 提交表单
    this.submitClothingForm(formData);
  },

  // 工具函数：格式化请求数据
  formatRequestData: function(formData) {
    const requestData = {
      userid: wx.getStorageSync('userid'),
      name: formData.name,
      primary_category: formData.primary_category, // 一级分类
      secondary_category: formData.secondary_category, // 二级分类
      color: formData.color || '',
      brand: formData.brand || '',
      size: formData.size || '', // 尺码
      season: formData.season || '', // 适用季节
      purchase_date: formData.purchase_date || '',
      price: formData.price ? parseFloat(formData.price) : 0,
      image_url: formData.image_url || '',
      tags: ""
    };
    
    // 确保数据类型正确
    if (requestData.price && typeof requestData.price !== 'number') {
      requestData.price = parseFloat(requestData.price) || 0;
    }
    
    // 将purchase_date转换为秒级时间戳
    if (requestData.purchase_date) {
      console.log('原始日期格式:', requestData.purchase_date);
      // 将日期字符串转换为时间戳（秒级）
      const date = new Date(requestData.purchase_date);
      if (!isNaN(date.getTime())) {
        requestData.purchase_date = Math.floor(date.getTime() / 1000); // 转换为秒级时间戳
        console.log('转换后的时间戳:', requestData.purchase_date);
      } else {
        // 如果转换失败，删除该字段
        delete requestData.purchase_date;
      }
    }
    
    return requestData;
  },

  // 提交衣物表单
  submitClothingForm(formData) {
    // 使用工具函数格式化请求数据
    const requestData = this.formatRequestData(formData);
    
    // 打印最终发送的数据以供调试
    console.log('最终发送的数据 (handleSubmit):', JSON.stringify(requestData, null, 2));
    
    console.log('提交的数据:', requestData);
    
    // 调用API创建衣物
    this.createClothing(requestData);
  },

  // 创建衣物
  createClothing(data) {
    console.log('发送网络请求:', data);
    
    // 从数据中提取userid并从请求体中移除
    const userid = wx.getStorageSync('userid');
    const requestData = {
      userid: userid,
      familyid: wx.getStorageSync('familyid') || '',
      memberid: wx.getStorageSync('selectedMemberId') || '',
      ...data
    };

    wx.request({
      url: config.getFullURL('clothing') + '/create',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('请求成功:', res);
        
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
          
          // 返回上一页
          wx.navigateBack();
        } else {
          console.log('服务器返回错误:', res);
          // 显示更详细的错误信息
          let errorMsg = '创建失败';
          if (res.data && res.data.detail) {
            errorMsg = res.data.detail;
          } else if (res.data && typeof res.data === 'object') {
            errorMsg = JSON.stringify(res.data);
          } else if (res.statusCode) {
            errorMsg = 'HTTP ' + res.statusCode;
          }
          
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.log('请求失败:', err);
        
        // 显示更详细的错误信息
        let errorMsg = '网络错误';
        if (err.errMsg) {
          errorMsg = err.errMsg;
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
      }
    });
  },
  
  // 获取当前一级分类下的二级分类
  getCurrentSecondaryCategories: function(primaryCategoryId) {
    // 如果没有传入参数，使用当前选中的一级分类
    const categoryId = primaryCategoryId || this.data.primaryCategory;
    
    // 从secondaryCategories中筛选出属于当前一级分类的二级分类
    return this.data.secondaryCategories.filter(item => {
      // 确保item是对象且有parent_id属性
      if (typeof item === 'object' && item.hasOwnProperty('parent_id')) {
        // 使用严格相等比较，确保类型一致
        return String(item.parent_id) === String(categoryId);
      }
      return false;
    });
  },
  
  // 根据分类ID获取分类名称
  getCategoryNameById: function(categoryId, categories) {
    if (!categoryId || !categories || categories.length === 0) return '';
    
    const category = categories.find(c => String(c.id) === String(categoryId));
    return category ? category.name : '';
  },
  
  // 下载图片并上传到COS
  downloadAndUploadImage: function(imageUrl, callback) {
    wx.downloadFile({
      url: imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;
          // 上传到COS
          this.uploadImageToCOS(tempFilePath, (cosUrl) => {
            callback(cosUrl);
          });
        } else {
          console.error('下载图片失败:', res);
          // 如果下载失败，使用原始URL
          callback(imageUrl);
        }
      },
      fail: (err) => {
        console.error('下载图片失败:', err);
        // 如果下载失败，使用原始URL
        callback(imageUrl);
      }
    });
  }
})