const config = require('../../../config/api.js');
const COS = require('../../../utils/cos-wx-sdk-v5.js');
const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');

Page({
  data: {
    clothingId: null,
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    defaultImageUrl: '', // 缺省图片URL（带签名）
    cosInstance: null, // 共享的COS实例
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
    defaultBrand: null, // 默认选中的品牌
    price: '',
    season: '', // 适用季节
    seasonIndex: -1, // 季节选择索引
    seasonOptions: ['春', '夏', '秋', '冬'],
    size: '', // 尺码
    purchaseDate: '',
    // 分类数据
    primaryCategories: [], // 一级分类
    secondaryCategories: [], // 二级分类
    primaryCategoryIndex: -1, // 一级分类选择索引
    secondaryCategoryIndex: -1, // 二级分类选择索引
    secondaryCategoryOptions: [], // 当前一级分类下的二级分类选项
  },

  // 将秒级时间戳转换为年月日格式
  formatTimestampToDate: function(timestamp) {
    if (!timestamp) return '';
    
    // 如果是字符串，尝试转换为数字
    if (typeof timestamp === 'string') {
      timestamp = parseInt(timestamp);
    }
    
    // 如果是秒级时间戳，转换为毫秒级
    if (timestamp < 10000000000) {
      timestamp = timestamp * 1000;
    }
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  // 将年月日格式转换为秒级时间戳
  formatDateToTimestamp: function(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return Math.floor(date.getTime() / 1000);
  },

  onLoad: function (options) {
    const clothingId = options.id;
    if (clothingId) {
      this.setData({
        clothingId: clothingId
      });
      // 获取分类和品牌数据
      this.getCategories();
      this.getBrandList();
      this.getClothingDetail(clothingId);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
    }
  },

  // 获取衣物详情
  getClothingDetail: function (clothingId) {
    wx.request({
      url: config.getFullURL('clothing') + '/detail',
      method: 'POST',
      data: {
        clothing_id: parseInt(clothingId),
        userid: wx.getStorageSync('userid'),
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          const clothing = res.data.result;
          
          // 设置表单数据
          this.setData({
            name: clothing.name || '',
            primaryCategory: clothing.primary_category || '',
            secondaryCategory: clothing.secondary_category || '',
            color: clothing.color || '',
            brand: clothing.brand || '',
            season: clothing.season || '',
            size: clothing.size || '',
            price: clothing.price || '',
            purchaseDate: clothing.purchase_date ? this.formatTimestampToDate(clothing.purchase_date) : ''
          });
          
          // 设置原始COS链接用于保存
          this.setData({
            cosImageUrl: clothing.image_url || ''
          });
          
          // 处理图片URL鉴权用于显示
          if (clothing.image_url) {
            this.getSignedCosUrl(clothing.image_url, (signedUrl) => {
              this.setData({
                imageUrl: signedUrl
              });
            });
          } else {
            // 如果没有图片，使用缺省图片
            this.getDefaultImageSignedUrl((defaultImageUrl) => {
              this.setData({
                imageUrl: defaultImageUrl
              });
            });
          }
          
          // 设置颜色索引
          if (clothing.color) {
            const colorIndex = this.data.colorOptions.indexOf(clothing.color);
            if (colorIndex !== -1) {
              this.setData({
                colorIndex: colorIndex
              });
            }
          }
          
          // 设置季节索引
          if (clothing.season) {
            const seasonIndex = this.data.seasonOptions.indexOf(clothing.season);
            if (seasonIndex !== -1) {
              this.setData({
                seasonIndex: seasonIndex
              });
            }
          }
          
          // 设置品牌索引和默认品牌
          if (clothing.brand && this.data.brandList.length > 0) {
            const brandIndex = this.data.brandList.findIndex(b => b.name === clothing.brand);
            if (brandIndex !== -1) {
              this.setData({
                brandIndex: brandIndex,
                defaultBrand: this.data.brandList[brandIndex]
              });
            }
          }
          
          // 设置一级分类索引
          if (clothing.primary_category && this.data.primaryCategories.length > 0) {
            const primaryCategoryIndex = this.data.primaryCategories.findIndex(c => c.id === clothing.primary_category);
            if (primaryCategoryIndex !== -1) {
              this.setData({
                primaryCategoryIndex: primaryCategoryIndex
              });
              
              // 更新二级分类选项
              const secondaryCategoryOptions = this.getCurrentSecondaryCategories(clothing.primary_category);
              this.setData({
                secondaryCategoryOptions: secondaryCategoryOptions
              });
            }
          }
          
          // 设置二级分类索引
          if (clothing.secondary_category && this.data.secondaryCategoryOptions.length > 0) {
            const secondaryCategoryIndex = this.data.secondaryCategoryOptions.findIndex(c => c.id === clothing.secondary_category);
            if (secondaryCategoryIndex !== -1) {
              this.setData({
                secondaryCategoryIndex: secondaryCategoryIndex
              });
            }
          }
        } else if (res.statusCode === 404) {
          wx.showToast({
            title: '衣物不存在',
            icon: 'none'
          });
          wx.navigateBack();
        } else if (res.statusCode === 422) {
          // 专门处理422错误，显示更详细的错误信息
          let errorMsg = '数据验证失败';
          if (res.data && res.data.detail) {
            // 解析错误详情
            const details = res.data.detail;
            if (Array.isArray(details) && details.length > 0) {
              errorMsg = details[0].msg || errorMsg;
            }
          }
          wx.showToast({
            title: errorMsg,
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

  // 上传图片到腾讯云COS（带回调）
  uploadImageToCOS(filePath, callback) {
    console.log('开始上传图片到COS（使用SDK）:', filePath);
    const that = this;
    
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
      const key = `jmrecipe/clothing/${timestamp}_${random}.${ext}`;
      
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
          // 保存原始COS链接用于提交
          that.setData({
            cosImageUrl: cosUrl
          });
          
          // 获取带签名的URL用于显示
          that.getSignedCosUrl(cosUrl, (signedUrl) => {
            that.setData({
              imageUrl: signedUrl
            });
            wx.showToast({
              title: '图片上传成功',
              icon: 'success'
            });
            if (callback && typeof callback === 'function') {
              callback(cosUrl); // 回调使用原始链接
            }
          });
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

  bindDateChange: function(e) {
    this.setData({
      purchaseDate: e.detail.value
    });
  },
  
  onSizeInput: function(e) {
    this.setData({
      size: e.detail.value
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
  
  // 价格输入处理函数
  onPriceInput: function(e) {
    this.setData({
      price: e.detail.value
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
  
  // 名称输入处理函数
  onNameInput: function(e) {
    this.setData({
      name: e.detail.value
    });
  },
  
  // 获取当前一级分类下的二级分类
  getCurrentSecondaryCategories: function(primaryCategoryId) {
    // 如果没有传入参数，使用当前选中的一级分类
    const categoryId = primaryCategoryId || this.data.primaryCategory;
    
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
      }
      return false;
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
  
  // 获取分类数据
  getCategories: function() {
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
  },

  // 更新衣物信息
  updateClothing: function(e) {
    const that = this;
    const clothingId = this.data.clothingId;
    
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
      purchase_date: this.data.purchaseDate ? this.formatDateToTimestamp(this.data.purchaseDate) : '',
      image_url: this.data.cosImageUrl || ''
    };
    
    // 验证必填字段
    if (!formData.name || !formData.primary_category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 构造符合后端接口要求的请求数据
    const requestData = {
      clothing_id: parseInt(clothingId),
      userid: wx.getStorageSync('userid') || '1',
      clothing_update: formData
    };
    
    // 发送更新请求
    wx.request({
      url: config.getFullURL('clothing') + '/update',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          // 返回上一页并刷新详情页数据
          setTimeout(() => {
            // 获取页面栈
            const pages = getCurrentPages();
            if (pages.length > 1) {
              // 获取上一个页面实例（详情页）
              const prevPage = pages[pages.length - 2];
              // 如果上一个页面是详情页，则调用其刷新方法
              if (prevPage && typeof prevPage.getClothingDetail === 'function') {
                prevPage.getClothingDetail(clothingId);
              }
            }
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '更新失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 取消编辑
  cancelEdit: function() {
    wx.navigateBack();
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
    const key = match[3]; // clothing/1754496891594_6800.png
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
  }
});