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
    clothingList: [],
    filteredClothingList: [],
    purchaseDate: '',
    name: '',
    category: '',
    color: '',
    colorIndex: 0,
    colorOptions: ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '黑色', '白色', '混合色'],
    brand: '',
    price: '',
    searchKeyword: '',
    searchResults: [],
    currentCategory: 'all', // 当前选中的分类
    selectedColor: '', // 当前选中的颜色
    selectedSeason: '', // 当前选中的季节
    totalCount: 0, // 总件数
    categoryCounts: {
      shangyi: 0,
      kuzhuang: 0,
      waitao: 0,
      xielv: 0
    },
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
      // 如果用户已登录，加载衣物列表
      this.getClothingList();
    }
  },
  
  // 工具函数：格式化请求数据
  formatRequestData: function(formData) {
    const requestData = {
      user_id: formData.user_id || 1, // 实际开发中需要获取当前用户ID
      name: formData.name,
      category: formData.category,
      color: formData.color || '',
      brand: formData.brand || '',
      purchase_date: formData.purchase_date || '',
      price: formData.price ? parseFloat(formData.price) : 0,
      image_url: formData.image_url || '',
      tags: []
    };
    
    // 确保数据类型正确
    if (requestData.price && typeof requestData.price !== 'number') {
      requestData.price = parseFloat(requestData.price) || 0;
    }
    
    // 确保日期格式正确
    if (requestData.purchase_date) {
      console.log('原始日期格式:', requestData.purchase_date);
      // 确保日期格式为 YYYY-MM-DD
      if (requestData.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // 已经是正确格式
        console.log('日期格式已正确');
      } else {
        // 尝试转换日期格式
        const date = new Date(requestData.purchase_date);
        if (!isNaN(date.getTime())) {
          requestData.purchase_date = date.toISOString().split('T')[0];
          console.log('转换后的日期格式:', requestData.purchase_date);
        }
      }
    }
    
    return requestData;
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
      colorIndex: 0,
      color: ''
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
      colorIndex: 0,
      color: ''
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
  
  onCategoryInput: function(e) {
    this.setData({
      category: e.detail.value
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
  
  onBrandInput: function(e) {
    this.setData({
      brand: e.detail.value
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
      category: this.data.category || '',
      color: this.data.color || '',
      brand: this.data.brand || '',
      price: this.data.price || '',
      purchase_date: this.data.purchaseDate || '',
      image_url: this.data.imageUrl || ''
    };
    
    console.log('页面数据:', formData);
    
    // 验证必填字段
    if (!formData.name || !formData.category) {
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
    if (!requestData.name || !requestData.category) {
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
    
    // 验证必填字段
    if (!formData.name || !formData.category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 添加其他字段到formData
    formData.purchase_date = this.data.purchaseDate || '';
    formData.image_url = this.data.imageUrl || '';
    
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
    
    // 从数据中提取user_id并从请求体中移除
    const user_id = data.user_id || 1;
    const requestData = { ...data };
    delete requestData.user_id;
    
    wx.request({
      url: config.getFullURL('clothing') + '?user_id=' + user_id,
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
    wx.request({
      url: config.getFullURL('clothing') + '/list',
      method: 'POST',
      data: {
        user_id: 1
      },
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
    
    console.log('处理后的衣物列表:', clothingList);
    
    // 更新总数和分类统计
    const totalCount = clothingList.length;
    const categoryCounts = {
      shangyi: clothingList.filter(item => item.category === '上衣').length,
      kuzhuang: clothingList.filter(item => item.category === '裤装').length,
      waitao: clothingList.filter(item => item.category === '外套').length,
      xielv: clothingList.filter(item => item.category === '鞋履').length
    };
    
    // 应用当前筛选条件
    let filteredList = this.applyFilters(clothingList);
    
    // 为列表中的每个服装项获取带签名的图片URL
    let processedCount = 0;
    const totalItems = clothingList.length;
    
    if (totalItems === 0) {
      this.setData({
        clothingList: clothingList,
        filteredClothingList: filteredList,
        totalCount: totalCount,
        categoryCounts: categoryCounts
      });
      return;
    }
    
    clothingList.forEach((clothing, index) => {
      if (clothing.image_url) {
        this.getSignedCosUrl(clothing.image_url, (signedUrl) => {
          clothingList[index].image_url = signedUrl;
          processedCount++;
          
          // 当所有项都处理完后更新数据
          if (processedCount === totalItems) {
            this.setData({
              clothingList: clothingList,
              filteredClothingList: filteredList,
              totalCount: totalCount,
              categoryCounts: categoryCounts
            });
          }
        });
      } else {
        processedCount++;
        
        // 当所有项都处理完后更新数据
        if (processedCount === totalItems) {
          this.setData({
            clothingList: clothingList,
            filteredClothingList: filteredList,
            totalCount: totalCount,
            categoryCounts: categoryCounts
          });
        }
      }
    });
  },
  
  // 应用筛选条件
  applyFilters: function(clothingList) {
    let filteredList = clothingList;
    
    // 按分类筛选
    if (this.data.currentCategory !== 'all') {
      filteredList = filteredList.filter(item => item.category === this.data.currentCategory);
    }
    
    // 按颜色筛选
    if (this.data.selectedColor) {
      filteredList = filteredList.filter(item => item.color === this.data.selectedColor);
    }
    
    // 按季节筛选
    if (this.data.selectedSeason) {
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
    
    // 引入COS凭证管理器
    const cosCredentialsManager = require('../../utils/cos-credentials-manager.js');
    
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
  
  // 切换分类
  switchCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category
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
  
  // 搜索衣物
  searchClothing(keyword) {
    if (!keyword) {
      // 如果搜索关键词为空，显示完整列表
      this.getClothingList();
      return;
    }
    
    wx.request({
      url: config.getFullURL('clothing') + '/search',
      method: 'POST',
      data: {
        user_id: 1,
        keyword: keyword
      },
      success: (res) => {
        if (res.statusCode === 200) {
          let clothingList = res.data;
          console.log('搜索到的衣物列表:', clothingList);
          this.setData({
            searchResults: clothingList
          });
        } else {
          wx.showToast({
            title: '搜索失败',
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
  
  // 搜索输入事件
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },
  
  // 搜索确认事件（回车搜索）
  onSearchConfirm: function(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    this.searchClothing(keyword);
  },
  
  // 搜索按钮点击事件
  onSearch: function() {
    this.searchClothing(this.data.searchKeyword);
  },
  
  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: ''
    });
    // 重新加载完整列表
    this.getClothingList();
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
  
  // 跳转到今日穿搭
  goToTodayOutfit: function() {
    wx.showToast({
      title: '今日穿搭功能待实现',
      icon: 'none'
    });
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 根据颜色标签获取颜色
  getColorByTag: function(color) {
    const colorMap = {
      '绿色': '#4CAF50',
      '黄色': '#FFEB3B',
      '棕色': '#795548',
      '灰色': '#9E9E9E',
      '红色': '#F44336',
      '蓝色': '#2196F3',
      '黑色': '#000000',
      '白色': '#FFFFFF'
    };
    return colorMap[color] || '#CCCCCC';
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
        user_id: 1,
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
        user_id: 1,
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
  }
})