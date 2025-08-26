const COS = require('../../../utils/cos-wx-sdk-v5.js');
const config = require('../../../config/api.js');
const cosCredentialsManager = require('../../../utils/cos-credentials-manager.js');
const { request } = require('../../../utils/request.js');

Page({
  data: {
    title: '衣橱列表页',
    showSearchModal: false,
    showAddOptionsModal: false, // 显示添加选项弹窗
    currentTab: 'wardrobe', // 当前选中的tab ('wardrobe' 或 'outfit')
    clothingList: [],
    filteredClothingList: [],
    currentPrimaryCategory: '总览', // 当前选中的一级分类
    currentSecondaryCategory: 'all', // 当前选中的二级分类
    selectedColor: '', // 当前选中的颜色
    selectedSeason: '', // 当前选中的季节
    totalCount: 0, // 总件数
    colorOptions: ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '黑色', '白色','卡其色','米色','粉色','棕色'], // 颜色选项
    seasonOptions: ['春', '夏', '秋', '冬'], // 季节选项
    // 分类数据
    primaryCategories: [], // 一级分类
    secondaryCategories: [], // 二级分类
    currentSecondaryCategories: [], // 当前展示的二级分类（默认显示所有）
    // 按性别区分的一级分类和二级分类
    maleCategories: {
    },
    femaleCategories: {
    },
    // 当前用户的分类（根据成员性别确定）
    currentCategories: {},
    isBatchMode: false, // 是否为批量选择模式
    selectedClothingIds: [], // 已选择的衣物ID数组
    // 用于跟踪每个衣物选中状态的对象
    clothingSelectionMap: {}, // 衣物选中状态映射
    // 成员相关数据
    members: [], // 成员列表
    selectedMemberId: null, // 选中的成员ID
    showMemberDropdown: false, // 是否显示成员下拉菜单
    // 分类选择模态框相关数据
    showCategoryModal: false, // 是否显示分类选择模态框
    selectedPrimaryCategory: null, // 选中的一级分类ID
    selectedPrimaryCategoryName: '', // 选中的一级分类名称
    selectedSecondaryCategory: null, // 选中的二级分类ID
    selectedSecondaryCategoryName: '' // 选中的二级分类名称
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
      // 获取成员列表和选中的成员
      this.loadMembers();
      
      // 如果用户已登录，初始化分类数据并加载衣物列表
      // this.initCategories();
      this.getCategories(); // 获取分类数据
      this.getBrandList(); // 获取品牌列表
      // 注意：getClothingList将在getCategories成功后调用
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onShow() {
    // 页面显示时重新加载成员数据
    this.loadMembers();
    
    // 如果已经加载过数据，则刷新页面
    if (this.data.primaryCategories.length > 0) {
      this.getCategories();
      this.getBrandList();
      // 注意：getClothingList将在getCategories成功后调用
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log('用户下拉刷新');
    // 显示加载提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    // 重新加载数据
    this.getCategories();
    this.getBrandList();
    // 注意：getClothingList将在getCategories成功后调用
    this.loadMembers();
  },

  // 加载成员列表
  loadMembers: function() {
    // 从本地存储获取成员列表
    const members = wx.getStorageSync('members') || [];
    const selectedMemberId = wx.getStorageSync('selectedMemberId');

    this.setData({
      members: members,
      selectedMemberId: selectedMemberId
    });
    },

  // 切换选中的成员
  switchMember: function(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(m => m.memberid === memberId);
    
    if (member) {
      // 更新选中的成员ID
      this.setData({
        selectedMemberId: memberId,
        showMemberDropdown: false // 隐藏下拉菜单
      });
      
      // 保存选中的成员ID到本地存储
      wx.setStorageSync('selectedMemberId', memberId);
      
      // 重新加载数据
      this.getCategories();
      this.getBrandList();
      // 注意：getClothingList将在getCategories成功后调用
    }
  },

  // 切换tab
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    
    // 如果点击的是已经选中的tab，则不重复操作
    if (this.data.currentTab === tab) {
      return;
    }
    
    this.setData({
      currentTab: tab
    });
    
    // 根据选中的tab加载相应数据
    if (tab === 'wardrobe') {
      // 加载橱柜数据
      this.getCategories();
      this.getBrandList();
    } else if (tab === 'outfit') {
      // 加载穿搭数据（这里可以添加加载穿搭数据的逻辑）
      this.getOutfitList();
    }
  },

  // 获取穿搭列表（占位方法，后续可以实现具体逻辑）
  getOutfitList: function() {
    // TODO: 实现获取穿搭列表的逻辑
    console.log('获取穿搭列表');
    // 使用默认的穿搭集合数据
    const defaultOutfits = [
      {
        id: 0,
        name: '默认穿搭',
        description: '系统推荐的基础穿搭组合',
        image_url: '', // 可以设置默认图片
        type: 'default'
      },
      {
        id: 1,
        name: '日常穿搭',
        description: '适合日常生活的基本搭配',
        image_url: '',
        type: 'daily'
      },
      {
        id: 2,
        name: '职业穿搭',
        description: '适合工作场合的专业装扮',
        image_url: '',
        type: 'work'
      },
      {
        id: 3,
        name: '排队穿搭',
        description: '逛街购物时的时尚搭配',
        image_url: '',
        type: 'shopping'
      },
      {
        id: 4,
        name: '运动穿搭',
        description: '健身运动时的舒适装备',
        image_url: '',
        type: 'sport'
      },
      {
        id: 5,
        name: '季节穿搭',
        description: '根据季节变化的应季搭配',
        image_url: '',
        type: 'seasonal'
      }
    ];
    
    this.setData({
      clothingList: defaultOutfits,
      filteredClothingList: defaultOutfits,
      totalCount: defaultOutfits.length
    });
  },

  // 显示/隐藏成员下拉菜单
  toggleMemberDropdown: function() {
    this.setData({
      showMemberDropdown: !this.data.showMemberDropdown
    });
  },

  // 获取选中成员的姓名
  getSelectedMemberName: function() {
    const selectedMember = this.data.members.find(m => m.memberid === this.data.selectedMemberId);
    return selectedMember ? selectedMember.name : '请选择成员';
  },

  // 获取选中成员的头像URL
  getSelectedMemberAvatar: function() {
    const selectedMember = this.data.members.find(m => m.memberid === this.data.selectedMemberId);
    return selectedMember && selectedMember.avatar_url ? selectedMember.avatar_url : null;
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
    request({
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
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      },
      fail: () => {
        console.log('获取品牌列表网络错误');
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      }
    });
  },
  
  // 跳转到新增衣物页面
  // 显示添加选项弹窗
  showAddModal() {
    console.log('点击了添加按钮');
    this.setData({
      showAddOptionsModal: true
    });
  },
  
  // 显示添加穿搭选项弹窗
  showOutfitAddModal() {
    console.log('点击了添加穿搭按钮');
    // TODO: 实现添加穿搭的逻辑
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 显示分类选择模态框
  showCategoryModal: function() {
    this.setData({
      showCategoryModal: true,
      selectedPrimaryCategory: null,
      selectedPrimaryCategoryName: '',
      selectedSecondaryCategory: null,
      selectedSecondaryCategoryName: ''
    });
  },

  // 隐藏分类选择模态框
  hideCategoryModal: function() {
    this.setData({
      showCategoryModal: false,
      selectedPrimaryCategory: null,
      selectedPrimaryCategoryName: '',
      selectedSecondaryCategory: null,
      selectedSecondaryCategoryName: ''
    });
  },

  // 选择一级分类
  selectPrimaryCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    const categoryName = e.currentTarget.dataset.name;
    
    // 获取当前一级分类下的二级分类
    const currentSecondaryCategories = this.getCurrentSecondaryCategories(categoryId);
    
    this.setData({
      selectedPrimaryCategory: categoryId,
      selectedPrimaryCategoryName: categoryName,
      selectedSecondaryCategory: null,
      selectedSecondaryCategoryName: '',
      currentSecondaryCategories: currentSecondaryCategories
    });
  },

  // 选择二级分类
  selectSecondaryCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    const categoryName = e.currentTarget.dataset.name;
    
    this.setData({
      selectedSecondaryCategory: categoryId,
      selectedSecondaryCategoryName: categoryName
    });
  },

  // 返回重新选择一级分类
  backToPrimaryCategory: function() {
    this.setData({
      selectedPrimaryCategory: null,
      selectedPrimaryCategoryName: '',
      selectedSecondaryCategory: null,
      selectedSecondaryCategoryName: '',
      currentSecondaryCategories: []
    });
  },

  // 确认分类选择
  confirmCategorySelection: function() {
    // 先保存选中的分类值
    const selectedPrimary = this.data.selectedPrimaryCategory;
    const selectedSecondary = this.data.selectedSecondaryCategory;
    
    // 检查是否已选择一级分类
    if (!selectedPrimary) {
      wx.showToast({
        title: '请选择一级分类',
        icon: 'none'
      });
      return;
    }
    
    // 如果一级分类下有二级分类，但未选择二级分类
    if (this.data.currentSecondaryCategories.length > 0 && !selectedSecondary) {
      wx.showToast({
        title: '请选择二级分类',
        icon: 'none'
      });
      return;
    }
    
    // 隐藏模态框
    this.hideCategoryModal();
    // 执行移动分类操作，使用保存的值而不是data中的值
    this.moveClothingBatch(
      this.data.selectedClothingIds, 
      selectedPrimary,
      selectedSecondary,
    );
  },

  // 隐藏添加选项弹窗
  hideAddOptionsModal() {
    this.setData({
      showAddOptionsModal: false
    });
  },

  // 选择图片识别添加
  chooseImageRecognition() {
    this.hideAddOptionsModal();
    wx.navigateTo({
      url: '/pages/clothing/clothing-ai-recognize/clothing-ai-recognize'
    });
  },

  // 选择手动添加
  chooseManualAdd() {
    this.hideAddOptionsModal();
    wx.navigateTo({
      url: '/pages/clothing/clothing-add/clothing-add'
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
        
        // 生成唯一文件名
        const fileName = tempFilePaths[0].split('/').pop();
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const ext = fileName.split('.').pop();
        const key = `jmrecipe/clothing/${timestamp}_${random}.${ext}`;
        
        cosCredentialsManager.uploadImageToCOS(tempFilePaths[0], key, (err, cosUrl) => {
          if (err) {
            console.error('图片上传失败:', err);
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            });
          } else {
            console.log('图片上传完成:', cosUrl);
            this.setData({
              cosImageUrl: cosUrl
            });
            wx.showToast({
              title: '图片上传成功',
              icon: 'success'
            });
          }
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

    request({
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
      // memberid: wx.getStorageSync('selectedMemberId') || '',
      familyid: wx.getStorageSync('familyid') || '', // 家庭ID
    };
    
    // 如果有选中的成员，添加成员ID到请求数据中
    if (selectedMemberId) {
      requestData.memberid = selectedMemberId;
    }
    
    // 添加筛选参数
    if (this.data.currentPrimaryCategory !== '总览') {
      requestData.primary_category = this.data.currentPrimaryCategory;
    }
    
    if (this.data.currentSecondaryCategory !== 'all') {
      requestData.secondary_category = this.data.currentSecondaryCategory;
    }
    
    if (this.data.selectedColor) {
      requestData.color = this.data.selectedColor;
    }
    
    if (this.data.selectedSeason) {
      requestData.season = this.data.selectedSeason;
    }
    
    // 添加时间戳防止缓存
    requestData._t = Date.now();
    
    request({
      url: config.getFullURL('clothing') + '/list',
      method: 'POST',
      data: requestData,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          let clothingList = res.data.result || [];
          this.processClothingList(clothingList);
        } else {
          wx.showToast({
            title: '获取列表失败',
            icon: 'none'
          });
        }
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      }
    });
  },
  
  // 处理衣物列表数据（排序和图片URL处理）
  processClothingList: function(clothingList) {
    console.log('处理衣物列表数据:', clothingList);
    
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
      
      // 获取分类名称（如果分类数据已加载）
      if (this.data.primaryCategories && this.data.secondaryCategories) {
        const primaryCategoryName = this.getCategoryNameById(clothing.primary_category, this.data.primaryCategories);
        const secondaryCategoryName = this.getCategoryNameById(clothing.secondary_category, this.data.secondaryCategories);
        
        // 设置分类名称显示
        clothing.primary_category = primaryCategoryName || clothing.primary_category;
        clothing.secondary_category = secondaryCategoryName || clothing.secondary_category;
      }
    });

    // 更新总数
    const totalCount = clothingList.length;
    
    // 不再应用前端筛选，直接使用接口返回的数据
    let filteredList = clothingList;
    
    // 为列表中的每个服装项获取带签名的图片URL
    const totalItems = clothingList.length;
    
    if (totalItems === 0) {
      this.setData({
        clothingList: clothingList,
        filteredClothingList: filteredList,
        totalCount: totalCount
      });
      return;
    }
    
    // 收集所有需要签名的图片URL
    const imageUrls = [];
    const itemsWithImages = [];
    const itemsWithoutImages = [];
    
    clothingList.forEach((clothing, index) => {
      if (clothing.image_url) {
        imageUrls.push(clothing.image_url);
        itemsWithImages.push({clothing, index});
      } else {
        itemsWithoutImages.push({clothing, index});
      }
    });
    
    // 批量获取签名URL
    cosCredentialsManager.getBatchSignedCosUrls(imageUrls, (signedUrls) => {
      // 处理有图片的项目
      itemsWithImages.forEach(({clothing, index}) => {
        const signedUrl = signedUrls[clothing.image_url];
        if (signedUrl) {
          clothingList[index].image_url = signedUrl;
        }
      });
      
      // 处理没有图片的项目
      if (itemsWithoutImages.length > 0) {
        // 只获取一次缺省图片签名URL，然后应用到所有没有图片的项目
        this.getDefaultImageSignedUrl((defaultImageUrl) => {
          itemsWithoutImages.forEach(({clothing, index}) => {
            if (defaultImageUrl) {
              clothingList[index].image_url = defaultImageUrl;
            }
          });
          
          // 更新数据
          this.setData({
            clothingList: clothingList,
            filteredClothingList: filteredList,
            totalCount: totalCount
          });
        });
      } else {
        // 更新数据
        this.setData({
          clothingList: clothingList,
          filteredClothingList: filteredList,
          totalCount: totalCount
        });
      }
    });
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
  
    
  // 切换一级分类
  switchPrimaryCategory: function(e) {
    const primaryCategory = e.currentTarget.dataset.category;
    
    // 如果点击的是已经选中的一级分类，则不重复调用接口
    if (this.data.currentPrimaryCategory === primaryCategory) {
      return;
    }
    
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
    
    // 重新请求接口获取数据
    this.getClothingList();
  },
  
  // 切换二级分类
  switchSecondaryCategory: function(e) {
    const secondaryCategory = e.currentTarget.dataset.category;
    
    // 如果点击的是已经选中的二级分类，则不重复调用接口
    if (this.data.currentSecondaryCategory === secondaryCategory) {
      return;
    }
    
    this.setData({
      currentSecondaryCategory: secondaryCategory
    });
    
    // 重新请求接口获取数据
    this.getClothingList();
  },
  
  // 选择颜色
  selectColor: function(e) {
    const color = e.currentTarget.dataset.color;
    
    // 如果点击的是已经选中的颜色，则不重复调用接口
    if (this.data.selectedColor === color) {
      return;
    }
    
    this.setData({
      selectedColor: color
    });
    
    // 重新请求接口获取数据
    this.getClothingList();
  },
  
  // 选择季节
  selectSeason: function(e) {
    const season = e.currentTarget.dataset.season;
    
    // 如果点击的是已经选中的季节，则不重复调用接口
    if (this.data.selectedSeason === season) {
      return;
    }
    
    this.setData({
      selectedSeason: season
    });
    
    // 重新请求接口获取数据
    this.getClothingList();
  },

  // 获取缺省图片的带签名URL
  getDefaultImageSignedUrl: function(callback) {
    // 缺省图片的COS路径
    const defaultImagePath = 'jmrecipe/Index/设计缺省页.png';
    const defaultImageUrl = `https://${'jmrecipe-1309147067'}.cos.${'ap-shanghai'}.myqcloud.com/${defaultImagePath}`;
    
    // 使用统一的签名URL获取方法（已包含缓存机制）
    cosCredentialsManager.getSignedCosUrl(defaultImageUrl, (signedUrl) => {
      callback(signedUrl);
    });
  },

  // 初始化COS实例
    
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
    const clothingItem = e.currentTarget.dataset.item;
    
    // 检查ID是否存在，如果不存在则尝试从item中获取
    let validClothingId = clothingId;
    if (!validClothingId && clothingItem) {
      validClothingId = clothingItem.id || clothingItem._id;
    }
    
    if (!validClothingId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/clothing/clothing-detail/clothing-detail?id=${validClothingId}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 跳转到穿搭列表页
  goToOutfitDetail: function(e) {
    const outfitId = e.currentTarget.dataset.id;
    const outfitItem = e.currentTarget.dataset.item;
    
    console.log('跳转到穿搭列表页，outfitId:', outfitId);
    console.log('跳转到穿搭列表页，outfitItem:', outfitItem);
    
    // 检查穿搭类型是否存在
    const outfitType = outfitItem.type;
    const outfitName = outfitItem.name;
    
    if (!outfitType) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到穿搭列表页面，传递类型参数
    wx.navigateTo({
      url: `/pages/outfit/outfit-list/outfit-list?type=${outfitType}&name=${outfitName}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 长按衣物卡片
  onLongPressClothing: function(e) {
    // 进入批量选择模式
    this.setData({
      isBatchMode: true,
      selectedClothingIds: [],
      clothingSelectionMap: {}
    });
    
    // 选择当前长按的衣物
    const clothingId = e.currentTarget.dataset.id;
    this.toggleClothingSelection(clothingId);
  },
  
  // 切换衣物选择状态
  toggleClothingSelection: function(clothingId) {
    // 确保ID是字符串类型，以避免类型不匹配问题
    const id = String(clothingId);
    const selectedIds = this.data.selectedClothingIds.map(item => String(item));
    const index = selectedIds.indexOf(id);
    
    // 更新选中状态映射
    const selectionMap = this.data.clothingSelectionMap;
    selectionMap[id] = index === -1; // 如果未选中则设为true，否则设为false
    
    if (index > -1) {
      // 如果已选择，则取消选择
      selectedIds.splice(index, 1);
    } else {
      // 如果未选择，则添加到选择列表
      selectedIds.push(id);
    }
    
    this.setData({
      selectedClothingIds: selectedIds,
      clothingSelectionMap: selectionMap
    });
  },
  
    
  // 退出批量选择模式
  exitBatchMode: function() {
    this.setData({
      isBatchMode: false,
      selectedClothingIds: [],
      clothingSelectionMap: {}
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
    request({
      url: config.getFullURL('clothing') + '/batchDelete',
      method: 'POST',
      data: {
        userid: wx.getStorageSync('userid'),
        clothing_ids: clothingIds
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
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
    
    // 显示新的分类选择模态框
    this.showCategoryModal();
  },
  
  // 批量移动衣物分类的API调用
  moveClothingBatch: function(clothingIds, primaryCategoryId, secondaryCategoryId) {
    // 构造请求数据，确保传入正确的值而不是null
    const updateData = {};
    
    // 只有当一级分类ID有效时才添加到更新数据中
    if (primaryCategoryId !== null && primaryCategoryId !== undefined) {
      updateData.primary_category = primaryCategoryId;
    }
    
    // 只有当二级分类ID有效时才添加到更新数据中
    if (secondaryCategoryId !== null && secondaryCategoryId !== undefined) {
      updateData.secondary_category = secondaryCategoryId;
    }
    
    // 如果没有有效的更新数据，则不执行更新
    if (Object.keys(updateData).length === 0) {
      wx.showToast({
        title: '请选择有效分类',
        icon: 'none'
      });
      return;
    }
    
    const requestData = {
      userid: wx.getStorageSync('userid'),
      clothing_ids: clothingIds,
      update: updateData
    };

    request({
      url: config.getFullURL('clothing') + '/batchUpdate',
      method: 'POST',
      data: requestData,
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
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
    // 从成员列表中找到选中的成员
    const selectedMember = members.find(m => m.memberid === selectedMemberId);
    
    // 根据成员性别设置参数，1表示男，2表示女
    let genderParam = 1; // 默认为男
    if (selectedMember) {
      // 根据实际的性别字段进行判断
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

    request({
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
            secondaryCategories: secondary,
            currentSecondaryCategories: secondary // 默认显示所有二级分类
          });
          
          // 在分类数据获取成功后再获取服装列表
          this.getClothingList();
        } else {
          console.error('获取分类数据失败', res);
          // 即使分类数据获取失败，也尝试获取服装列表
          this.getClothingList();
        }
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      },
      fail: (err) => {
        console.error('获取分类数据网络错误', err);
        // 即使分类数据获取失败，也尝试获取服装列表
        this.getClothingList();
        // 隐藏加载提示
        wx.hideLoading();
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      }
    });
  }
})