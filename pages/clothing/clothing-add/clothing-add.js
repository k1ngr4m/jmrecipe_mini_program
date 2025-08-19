const COS = require('../../../utils/cos-wx-sdk-v5.js');
const config = require('../../../config/api.js');

Page({
  data: {
    title: '新增衣物',
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    defaultImageUrl: '', // 缺省图片URL（带签名）
    cosInstance: null, // 共享的COS实例
    purchaseDate: '',
    name: '',
    primaryCategory: '', // 一级分类
    secondaryCategory: '', // 二级分类
    color: '',
    colorIndex: 0,
    colorOptions: ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '黑色', '白色','卡其色','米色','粉色','棕色'],
    brand: '',
    brandId: null,
    brandList: [], // 品牌列表
    brandIndex: -1, // 品牌选择索引
    price: '',
    season: '', // 适用季节
    seasonIndex: -1, // 季节选择索引
    seasonOptions: ['春', '夏', '秋', '冬'],
    size: '', // 尺码
    // 分类数据
    primaryCategories: [], // 一级分类
    secondaryCategories: [], // 二级分类
    primaryCategoryIndex: -1, // 一级分类选择索引
    secondaryCategoryIndex: -1, // 二级分类选择索引
    secondaryCategoryOptions: [], // 当前一级分类下的二级分类选项
    // 按性别区分的一级分类和二级分类
    maleCategories: {
    },
    femaleCategories: {
    },
    // 当前用户的分类（根据成员性别确定）
    currentCategories: {}
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
      // 如果用户已登录，初始化分类数据并加载衣物列表
      this.getCategories(); // 获取分类数据
      this.getBrandList(); // 获取品牌列表
      this.initCosInstance(); // 初始化COS实例
    }
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
      season: formData.season || '', // 适用季节
      size: formData.size || '', // 尺码
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
  
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          imageUrl: tempFilePaths[0]
        });
        
        console.log('选择的图片路径:', tempFilePaths[0]);
      }
    });
  },
  
  // 选择并上传图片
  chooseAndUploadImage() {
    wx.chooseImage({
      count: 1,
    sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.setData({
          imageUrl: tempFilePaths[0]
        });
        
        console.log('选择的图片路径:', tempFilePaths[0]);
        
        // 选择图片后立即上传到COS
        wx.showToast({
          title: '正在上传图片...',
          icon: 'loading'
        });
        
        this.uploadImageToCOS(tempFilePaths[0], (cosUrl) => {
          console.log('图片上传完成:', cosUrl);
        });
      }
    });
  },
  
  bindDateChange: function(e) {
    this.setData({
      purchaseDate: e.detail.value
    });
  },
  
  onNameInput: function(e) {
    this.setData({
      name: e.detail.value
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
  
  // 品牌选择事件
  onBrandSelect: function(e) {
    const brand = e.detail.brand;
    this.setData({
      brand: brand.name,
      brandId: brand.id
    });
  },
  
  // 品牌清空事件
  onBrandClear: function() {
    this.setData({
      brand: '',
      brandId: null
    });
  },
  
  onSizeInput: function(e) {
    this.setData({
      size: e.detail.value
    });
  },
  
  onPriceInput: function(e) {
    this.setData({
      price: e.detail.value
    });
  },
  
  handleSubmit() {
    console.log('手动提交事件触发');
    
    // 构造表单数据
    const formData = {
      name: this.data.name || '',
      primary_category: this.data.primaryCategory || '',
      secondary_category: this.data.secondaryCategory || '',
      color: this.data.color || '',
      brand: this.data.brand || '',
      season: this.data.season || '',
      size: this.data.size || '',
      price: this.data.price || '',
      purchase_date: this.data.purchaseDate || '',
      image_url: this.data.imageUrl || ''
    };
    
    console.log('页面数据:', formData);
    
    // 验证必填字段
    if (!formData.name || !formData.primary_category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 如果有本地图片但还没有上传到COS，则先上传
    if (this.data.imageUrl && !this.data.cosImageUrl) {
      wx.showToast({
        title: '正在上传图片...',
        icon: 'loading'
      });
      
      // 上传图片到COS
      this.uploadImageToCOS(this.data.imageUrl, (cosUrl) => {
        // 上传完成后更新表单数据并提交
        formData.image_url = cosUrl;
        this.submitClothingForm(formData);
      });
    } else {
      // 使用COS图片URL（如果可用）
      if (this.data.cosImageUrl) {
        formData.image_url = this.data.cosImageUrl;
      }
      
      // 直接提交表单
      this.submitClothingForm(formData);
    }
  },
  
  // 提交衣物表单
  submitClothingForm(formData) {
    // 使用工具函数格式化请求数据
    const requestData = this.formatRequestData(formData);
    
    // 打印最终发送的数据以供调试
    console.log('最终发送的数据 (handleSubmit):', JSON.stringify(requestData, null, 2));
    
    console.log('提交的数据:', requestData);
    
    // 检查数据格式
    if (!requestData.name || !requestData.primary_category) {
      wx.showToast({
        title: '名称和分类为必填项',
        icon: 'none'
      });
      return;
    }
    
    // 调用API创建衣物
    this.createClothing(requestData);
  },
  
  // 上传图片到腾讯云COS（带回调）
  uploadImageToCOS(filePath, callback) {
    console.log('开始上传图片到COS（使用SDK）:', filePath);
    const that = this;
    
    wx.request({
      url: config.getFullURL('cosCredentials'),
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.tmp_secret_id) {
          const credentials = res.data;
          
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
        } else {
          console.error('获取临时密钥失败:', res);
          wx.showToast({
            title: '获取上传凭证失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取临时密钥失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
  
  addClothing(e) {
    console.log('表单提交事件触发');
    
    const formData = e.detail.value;
    console.log('表单数据:', formData);
    
    // 添加其他字段到formData（在验证之前）
    formData.primary_category = this.data.primaryCategory || '';
    formData.secondary_category = this.data.secondaryCategory || '';
    formData.color = this.data.color || '';
    formData.brand = this.data.brand || '';
    formData.season = this.data.season || '';
    formData.size = this.data.size || '';
    formData.purchase_date = this.data.purchaseDate || '';
    formData.price = this.data.price || '';
    formData.image_url = this.data.imageUrl || '';
    
    // 验证必填字段
    if (!formData.name || !formData.primary_category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 如果有本地图片但还没有上传到COS，则先上传
    if (this.data.imageUrl && !this.data.cosImageUrl) {
      wx.showToast({
        title: '正在上传图片...',
        icon: 'loading'
      });
      
      // 上传图片到COS
      this.uploadImageToCOS(this.data.imageUrl, (cosUrl) => {
        // 上传完成后更新表单数据并提交
        formData.image_url = cosUrl;
        this.submitClothingForm(formData);
      });
    } else {
      // 使用COS图片URL（如果可用）
      if (this.data.cosImageUrl) {
        formData.image_url = this.data.cosImageUrl;
      }
      
      // 直接提交表单
      this.submitClothingForm(formData);
    }
  },
  
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
    const categoryId = primaryCategoryId || this.data.currentPrimaryCategory;
    
    // 从secondaryCategories中筛选出属于当前一级分类的二级分类
    // 尝试多种可能的关联字段
    return this.data.secondaryCategories.filter(item => {
      // 如果item是对象且有parent属性
      if (typeof item === 'object') {
        // 尝试parent_id字段
        if (item.parent_id !== undefined && item.parent_id == categoryId) {
          return true;
        }
        // 尝试parent_category_id字段
        if (item.parent_category_id !== undefined && item.parent_category_id == categoryId) {
          return true;
        }
        // 尝试primary_category_id字段
        if (item.primary_category_id !== undefined && item.primary_category_id == categoryId) {
          return true;
        }
        // 尝试category_id字段
        if (item.category_id !== undefined && item.category_id == categoryId) {
          return true;
        }
        // 尝试name或id匹配（如果一级分类和二级分类有某种命名规律）
        // 这里可以根据实际数据结构调整
      }
      return false;
    });
  },

  // 获取缺省图片的带签名URL
  getDefaultImageSignedUrl: function(callback) {
    // 如果已经有缓存的签名URL且未过期，则直接使用
    if (this.data.defaultImageUrl) {
      callback(this.data.defaultImageUrl);
      return;
    }
    
    // 缺省图片的COS路径
    const defaultImagePath = 'jmrecipe/Index/设计缺省页.png';
    const bucket = 'jmrecipe-1309147067';
    const region = 'ap-shanghai';
    const key = defaultImagePath;
    
    // 初始化COS实例
    this.initCosInstance().then(cos => {
      // 获取带签名的URL
      cos.getObjectUrl({
        Bucket: bucket,
        Region: region,
        Key: key,
        Sign: true
      }, (err, data) => {
        if (err) {
          console.error('获取缺省图片签名URL失败:', err);
          callback(''); // 如果获取失败，返回空字符串
        } else {
          // 缓存签名URL
          this.setData({
            defaultImageUrl: data.Url
          });
          callback(data.Url);
        }
      });
    }).catch(error => {
      console.error('初始化COS实例失败:', error);
      callback(''); // 如果获取失败，返回空字符串
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
  
  // 根据分类ID获取分类名称
  getCategoryNameById: function(categoryId, categories) {
    if (!categoryId || !categories || categories.length === 0) return '';
    
    const category = categories.find(c => c.id == categoryId);
    return category ? category.name : '';
  },
  
  getCategories() {
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    const members = wx.getStorageSync('members') || [];
    const selectedMember = members.find(m => m.memberid === selectedMemberId);
    
    // 根据成员性别设置参数，1表示男，2表示女
    let genderParam = 1; // 默认为男
    if (selectedMember) {
      // 注意：这里需要根据实际的性别字段进行调整
      // 如果gender字段是数字类型（1男/2女）
      if (selectedMember.gender === 2 || selectedMember.gender === '2') {
        genderParam = 2;
      } else if (selectedMember.gender === 1 || selectedMember.gender === '1') {
        genderParam = 1;
      }
      // 如果gender字段是字符串类型（"男"/"女"）
      else if (selectedMember.gender === '女') {
        genderParam = 2;
      } else if (selectedMember.gender === '男') {
        genderParam = 1;
      }
    }

    console.log('获取分类数据', {
      selectedMemberId,
      selectedMember,
      members,
      familyid: wx.getStorageSync('familyid') || '',
      gender: genderParam
    });

    wx.request({
      url: config.getFullURL('categories') + '/list',
      method: 'POST',
      data: {
        familyid: wx.getStorageSync('familyid') || '',
        gender: genderParam, // 传递性别参数，1男/2女
        // 添加时间戳防止缓存
        _t: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          // 根据新的数据结构处理分类数据
          const categories = res.data.result || [];
          const primary = categories.filter(c => c.level === 1);
          const secondary = categories.filter(c => c.level === 2);
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
  }
})