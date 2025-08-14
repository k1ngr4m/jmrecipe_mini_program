const COS = require('../../utils/cos-wx-sdk-v5.js');
const config = require('../../config/api.js');

Page({
  data: {
    title: '衣橱列表页',
    showModal: false,
    showAddOptionsModal: false, // 新增服装选择弹窗
    showSearchModal: false,
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    defaultImageUrl: '', // 缺省图片URL（带签名）
    cosInstance: null, // 共享的COS实例
    clothingList: [],
    filteredClothingList: [],
    purchaseDate: '',
    name: '',
    primaryCategory: '', // 一级分类
    secondaryCategory: '', // 二级分类
    color: '',
    colorIndex: 0,
    colorOptions: ['红', '橙', '黄', '绿', '蓝', '紫', '黑', '白'],
    brand: '',
    brandList: [], // 品牌列表
    brandIndex: -1, // 品牌选择索引
    price: '',
    season: '', // 适用季节
    seasonIndex: -1, // 季节选择索引
    seasonOptions: ['春', '夏', '秋', '冬'],
    searchKeyword: '',
    searchResults: [],
    currentPrimaryCategory: '总览', // 当前选中的一级分类
    currentSecondaryCategory: 'all', // 当前选中的二级分类
    selectedColor: '', // 当前选中的颜色
    selectedSeason: '', // 当前选中的季节
    totalCount: 0, // 总件数
    // 分类数据
    primaryCategories: [], // 一级分类
    secondaryCategories: [], // 二级分类
    currentSecondaryCategories: [], // 当前一级分类下的二级分类
    primaryCategoryIndex: -1, // 一级分类选择索引
    secondaryCategoryIndex: -1, // 二级分类选择索引
    secondaryCategoryOptions: [], // 当前一级分类下的二级分类选项
    // 按性别区分的一级分类和二级分类
    maleCategories: {
    },
    femaleCategories: {
    },
    // 当前用户的分类（根据成员性别确定）
    currentCategories: {},
    isBatchMode: false, // 是否为批量选择模式
    selectedClothingIds: [] // 已选择的衣物ID数组
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
      // this.initCategories();
      this.getCategories(); // 获取分类数据
      this.getBrandList(); // 获取品牌列表
      this.initCosInstance(); // 初始化COS实例
      this.getClothingList();
    }
  },

  // 初始化分类数据（根据成员性别）
  initCategories: function() {
    // 获取选中的成员ID和性别
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    const members = wx.getStorageSync('members') || [];
    const selectedMember = members.find(member => member.id === selectedMemberId);
    
    // 根据成员性别设置分类数据
    let currentCategories = {};
    if (selectedMember && selectedMember.gender === '女') {
      currentCategories = this.data.femaleCategories;
    } else {
      // 默认为男性分类（包括未设置性别的情况）
      currentCategories = this.data.maleCategories;
    }
    
    this.setData({
      currentCategories: currentCategories
    });
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
      purchase_date: formData.purchase_date || '',
      price: formData.price ? parseFloat(formData.price) : 0,
      image_url: formData.image_url || '',
      tags: []
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
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            brandList: res.data || []
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
  
  // 显示新增服装选择弹窗
  showAddModal() {
    this.setData({
      showAddOptionsModal: true
    });
  },
  
  // 隐藏新增服装选择弹窗
  hideAddOptionsModal() {
    this.setData({
      showAddOptionsModal: false
    });
  },
  
  // 显示手动填写表单弹窗
  showManualAddModal() {
    this.setData({
      showAddOptionsModal: false,
      showModal: true,
      primaryCategory: '',
      secondaryCategory: '',
      primaryCategoryIndex: -1,
      secondaryCategoryIndex: -1,
      colorIndex: 0,
      color: '',
      season: '',
      seasonIndex: -1,
      brand: '',
      brandIndex: -1
    });
  },
  
  // 拍照识别功能
  chooseTakePhoto() {
    wx.showToast({
      title: '拍照识别功能正在开发中',
      icon: 'none'
    });
    
    // 隐藏选择弹窗
    this.setData({
      showAddOptionsModal: false
    });
  },
  
  hideAddModal() {
    this.setData({
      showModal: false,
      imageUrl: '',
      cosImageUrl: '',  // 清空COS图片URL
      purchaseDate: '',  // 清空日期选择
      primaryCategory: '',
      secondaryCategory: '',
      colorIndex: 0,
      color: '',
      season: '',
      seasonIndex: -1,
      brand: '',
      brandIndex: -1
    });
  },
  
  showSearch() {
    this.setData({
      showSearchModal: true
    });
  },
  
  hideSearch() {
    this.setData({
      showSearchModal: false,
      searchKeyword: '',
      searchResults: []
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
  
  // 品牌选择改变事件
  onBrandChange: function(e) {
    const brandIndex = e.detail.value;
    const brand = this.data.brandList[brandIndex];
    this.setData({
      brandIndex: brandIndex,
      brand: brand ? brand.name : ''
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
        
        if (res.statusCode === 200) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
          
          // 关闭弹窗
          this.hideAddModal();
          
          // 刷新列表
          this.getClothingList();
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
  
  getClothingList() {
    // 获取选中的成员ID
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    
    // 获取用户ID
    const userid = wx.getStorageSync('userid') || 1;
    
    // 准备请求数据
    const requestData = {
      userid: userid,
      memberid: wx.getStorageSync('selectedMemberId') || '',
      familyid: wx.getStorageSync('familyid') || '', // 家庭ID
    };
    
    // 如果有选中的成员，添加成员ID到请求数据中
    if (selectedMemberId) {
      requestData.family_member_id = selectedMemberId;
    }
    
    // 添加筛选参数
    if (this.data.currentPrimaryCategory !== '总览') {
      requestData.category_id = this.data.currentPrimaryCategory;
    }
    
    if (this.data.currentSecondaryCategory !== 'all') {
      requestData.sub_category_id = this.data.currentSecondaryCategory;
    }
    
    if (this.data.selectedColor) {
      requestData.color = this.data.selectedColor;
    }
    
    if (this.data.selectedSeason) {
      requestData.season = this.data.selectedSeason;
    }
    
    wx.request({
      url: config.getFullURL('clothing') + '/list',
      method: 'POST',
      data: requestData,
      success: (res) => {
        if (res.statusCode === 200) {
          let clothingList = res.data;
          this.processClothingList(clothingList);
        } else {
          wx.showToast({
            title: '获取列表失败',
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
  
  // 处理衣物列表数据（排序和图片URL处理）
  processClothingList: function(clothingList) {
    // 确保列表从上方开始显示最新添加的项目
    // 如果后端返回的顺序是从旧到新，我们需要反转列表
    if (clothingList.length > 0) {
      // 先尝试按照id降序排列
      if (clothingList[0].id !== undefined) {
        clothingList.sort((a, b) => b.id - a.id);
      } else {
        // 如果没有id字段，反转列表顺序
        clothingList.reverse();
      }
    }
    
    // 将分类ID转换为分类名称
    clothingList.forEach(clothing => {
      // 保存原始分类ID
      clothing.primary_category_id = clothing.primary_category;
      clothing.secondary_category_id = clothing.secondary_category;
      
      // 获取分类名称
      const primaryCategoryName = this.getCategoryNameById(clothing.primary_category, this.data.primaryCategories);
      const secondaryCategoryName = this.getCategoryNameById(clothing.secondary_category, this.data.secondaryCategories);
      
      // 设置分类名称显示
      clothing.primary_category = primaryCategoryName || clothing.primary_category;
      clothing.secondary_category = secondaryCategoryName || clothing.secondary_category;
    });
    
    console.log('处理后的衣物列表:', clothingList);
    
    // 更新总数
    const totalCount = clothingList.length;
    
    // 应用当前筛选条件
    let filteredList = this.applyFilters(clothingList);
    
    // 为列表中的每个服装项获取带签名的图片URL
    let processedCount = 0;
    const totalItems = clothingList.length;
    
    if (totalItems === 0) {
      this.setData({
        clothingList: clothingList,
        filteredClothingList: filteredList,
        totalCount: totalCount
      });
      return;
    }
    
    // 分离需要处理签名URL的项目和需要使用缺省图片的项目
    const itemsWithImages = [];
    const itemsWithoutImages = [];
    
    clothingList.forEach((clothing, index) => {
      if (clothing.image_url) {
        itemsWithImages.push({clothing, index});
      } else {
        itemsWithoutImages.push({clothing, index});
      }
    });
    
    // 处理有图片的项目
    itemsWithImages.forEach(({clothing, index}) => {
      this.getSignedCosUrl(clothing.image_url, (signedUrl) => {
        clothingList[index].image_url = signedUrl;
        processedCount++;
        
        // 当所有项都处理完后更新数据
        if (processedCount === totalItems) {
          this.setData({
            clothingList: clothingList,
            filteredClothingList: filteredList,
            totalCount: totalCount
          });
        }
      });
    });
    
    // 处理没有图片的项目
    if (itemsWithoutImages.length > 0) {
      // 只获取一次缺省图片签名URL，然后应用到所有没有图片的项目
      this.getDefaultImageSignedUrl((defaultImageUrl) => {
        itemsWithoutImages.forEach(({clothing, index}) => {
          if (defaultImageUrl) {
            clothingList[index].image_url = defaultImageUrl;
          }
          processedCount++;
          
          // 当所有项都处理完后更新数据
          if (processedCount === totalItems) {
            this.setData({
              clothingList: clothingList,
              filteredClothingList: filteredList,
              totalCount: totalCount
            });
          }
        });
      });
    }
  },
  
  // 获取当前一级分类下的二级分类
  getCurrentSecondaryCategories: function(primaryCategoryId) {
    // 如果没有传入参数，使用当前选中的一级分类
    const categoryId = primaryCategoryId || this.data.currentPrimaryCategory;
    
    if (categoryId === '总览') {
      return [];
    }
    
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

  // 应用筛选条件
  applyFilters: function(clothingList) {
    let filteredList = clothingList;
    
    // 按一级分类筛选
    if (this.data.currentPrimaryCategory !== '总览') {
      filteredList = filteredList.filter(item => item.primary_category === this.data.currentPrimaryCategory);
    }
    
    // 按二级分类筛选
    if (this.data.currentSecondaryCategory !== 'all') {
      filteredList = filteredList.filter(item => item.secondary_category === this.data.currentSecondaryCategory);
    }
    
    // 按颜色筛选
    if (this.data.selectedColor !== '') {
      filteredList = filteredList.filter(item => item.color === this.data.selectedColor);
    }
    
    // 按季节筛选
    if (this.data.selectedSeason !== '') {
      filteredList = filteredList.filter(item => item.season === this.data.selectedSeason);
    }
    
    return filteredList;
  },
  
  // 检查当前筛选结果是否为空
  isEmptyState: function() {
    return this.data.filteredClothingList.length === 0;
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
  
  // 切换一级分类
  switchPrimaryCategory: function(e) {
    const primaryCategory = e.currentTarget.dataset.category;
    let currentSecondaryCategories = [];
    
    // 如果选择的是"总览"，则显示所有二级分类；否则显示当前一级分类下的二级分类
    if (primaryCategory === '总览') {
      currentSecondaryCategories = this.data.secondaryCategories;
    } else {
      currentSecondaryCategories = this.getCurrentSecondaryCategories(primaryCategory);
    }
    
    this.setData({
      currentPrimaryCategory: primaryCategory,
      currentSecondaryCategory: 'all', // 重置二级分类筛选
      currentSecondaryCategories: currentSecondaryCategories // 更新当前二级分类列表
    });
    
    // 重新应用筛选
    const filteredList = this.applyFilters(this.data.clothingList);
    this.setData({
      filteredClothingList: filteredList
    });
  },
  
  // 切换二级分类
  switchSecondaryCategory: function(e) {
    const secondaryCategory = e.currentTarget.dataset.category;
    this.setData({
      currentSecondaryCategory: secondaryCategory
    });
    
    // 重新应用筛选
    const filteredList = this.applyFilters(this.data.clothingList);
    this.setData({
      filteredClothingList: filteredList
    });
  },
  
  // 选择颜色
  selectColor: function(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      selectedColor: color
    });
    
    // 重新应用筛选
    const filteredList = this.applyFilters(this.data.clothingList);
    this.setData({
      filteredClothingList: filteredList
    });
  },
  
  // 选择季节
  selectSeason: function(e) {
    const season = e.currentTarget.dataset.season;
    this.setData({
      selectedSeason: season
    });
    
    // 重新应用筛选
    const filteredList = this.applyFilters(this.data.clothingList);
    this.setData({
      filteredClothingList: filteredList
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
    const cosCredentialsManager = require('../../utils/cos-credentials-manager.js');
    const COS = require('../../utils/cos-wx-sdk-v5.js');
    
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
  
  // 清理衣物
  cleanClothing: function() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理选中的衣物吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '清理功能待实现',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // 根据分类ID获取分类名称
  getCategoryNameById: function(categoryId, categories) {
    if (!categoryId || !categories || categories.length === 0) return '';
    
    const category = categories.find(c => c.id == categoryId);
    return category ? category.name : '';
  },
  
  // 根据季节标签获取显示文本
  getSeasonByTag: function(season) {
    const seasonMap = {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    };
    return seasonMap[season] || season;
  },
  
  // 跳转到详情页
  goToDetail: function(e) {
    // 如果在批量选择模式下，执行选择操作而不是跳转
    if (this.data.isBatchMode) {
      const clothingId = e.currentTarget.dataset.id;
      this.toggleClothingSelection(clothingId);
      return;
    }
    
    const clothingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/clothing-detail/clothing-detail?id=${clothingId}`
    });
  },
  
  // 长按衣物卡片
  onLongPressClothing: function(e) {
    // 进入批量选择模式
    this.setData({
      isBatchMode: true,
      selectedClothingIds: []
    });
    
    // 选择当前长按的衣物
    const clothingId = e.currentTarget.dataset.id;
    this.toggleClothingSelection(clothingId);
  },
  
  // 切换衣物选择状态
  toggleClothingSelection: function(clothingId) {
    const selectedIds = this.data.selectedClothingIds;
    const index = selectedIds.indexOf(clothingId);
    
    if (index > -1) {
      // 如果已选择，则取消选择
      selectedIds.splice(index, 1);
    } else {
      // 如果未选择，则添加到选择列表
      selectedIds.push(clothingId);
    }
    
    this.setData({
      selectedClothingIds: selectedIds
    });
  },
  
  // 退出批量选择模式
  exitBatchMode: function() {
    this.setData({
      isBatchMode: false,
      selectedClothingIds: []
    });
  },
  
  // 批量删除衣物
  batchDeleteClothing: function() {
    if (this.data.selectedClothingIds.length === 0) {
      wx.showToast({
        title: '请选择要删除的衣物',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的${this.data.selectedClothingIds.length}件衣物吗？`,
      success: (res) => {
        if (res.confirm) {
          // 实现实际的删除逻辑
          this.deleteClothingBatch(this.data.selectedClothingIds);
        }
      }
    });
  },
  
  // 批量删除衣物的API调用
  deleteClothingBatch: function(clothingIds) {
    wx.request({
      url: config.getFullURL('clothing') + '/batch_delete',
      method: 'POST',
      data: {
        userid: wx.getStorageSync('userid'),
        clothing_ids: clothingIds
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 删除完成后退出批量模式
          this.exitBatchMode();
          
          // 刷新列表
          this.getClothingList();
        } else {
          wx.showToast({
            title: '删除失败',
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
  
  // 批量移动分类
  batchMoveCategory: function() {
    if (this.data.selectedClothingIds.length === 0) {
      wx.showToast({
        title: '请选择要移动的衣物',
        icon: 'none'
      });
      return;
    }
    
    // 显示选择分类的弹窗
    this.showCategorySelectionModal();
  },
  
  // 显示分类选择弹窗
  showCategorySelectionModal: function() {
    const categories = ['上衣', '裤装', '外套', '鞋履'];
    wx.showActionSheet({
      itemList: categories,
      success: (res) => {
        if (!res.cancel) {
          const selectedCategory = categories[res.tapIndex];
          this.moveClothingBatch(this.data.selectedClothingIds, selectedCategory);
        }
      }
    });
  },
  
  // 批量移动衣物分类的API调用
  moveClothingBatch: function(clothingIds, category) {
    wx.request({
      url: config.getFullURL('clothing') + '/batch_move',
      method: 'POST',
      data: {
        userid: wx.getStorageSync('userid'),
        clothing_ids: clothingIds,
        category: category
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '移动成功',
            icon: 'success'
          });
          
          // 移动完成后退出批量模式
          this.exitBatchMode();
          
          // 刷新列表
          this.getClothingList();
        } else {
          wx.showToast({
            title: '移动失败',
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

  getCategories() {
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    const members = wx.getStorageSync('members') || [];
    const selectedMember = members.find(m => m.id === selectedMemberId);
    const gender = selectedMember && selectedMember.gender === '女' ? 'female' : 'male';

    console.log('获取分类数据', {
      selectedMemberId,
      familyid: wx.getStorageSync('familyid') || '',
      gender
    });

    wx.request({
      url: config.getFullURL('categories') + '/list',
      method: 'POST',
      data: {
        familyid: wx.getStorageSync('familyid') || '',
        gender: gender
      },
      success: (res) => {
        console.log('获取分类数据成功', res);
        if (res.statusCode === 200) {
          console.log('完整的分类数据', res.data);
          const primary = res.data.filter(c => c.level === 1);
          const secondary = res.data.filter(c => c.level === 2);
          console.log('一级分类', primary);
          console.log('二级分类', secondary);
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