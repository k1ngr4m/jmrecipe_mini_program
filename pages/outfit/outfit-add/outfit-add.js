const config = require('../../../config/api.js');
const { request } = require('../../../utils/request.js');
const cosCredentialsManager = require("../../../utils/cos-credentials-manager");

Page({
  data: {
    title: '新建穿搭',
    // 分类数据
    primaryCategories: [], // 一级分类
    currentPrimaryCategory: 'all', // 当前选中的一级分类
    // 服装列表数据
    clothingList: [], // 所有服装
    filteredClothingList: [], // 筛选后的服装列表
    // Canvas相关数据
    canvasItems: [], // Canvas中的服装项
    selectedClothingId: null, // 当前选中的服装ID
    // 页面状态
    isLoading: false, // 加载状态
    signedUrl: '',
  },

  onLoad() {
    // 页面加载时获取分类数据和服装列表
    this.getCategories();
    this.getClothingList();
  },

  // 获取分类数据
  getCategories() {
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    
    request({
      url: config.getFullURL('categories') + '/list',
      method: 'POST',
      data: {
        userid: userid,
        familyid: familyid,
        // 添加时间戳防止缓存
        _t: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          // 根据新的数据结构处理分类数据
          const categories = res.data.result || [];
          const primary = categories.filter(c => c.level === 1);
          
          this.setData({
            primaryCategories: primary
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

  // 获取服装列表
  getClothingList() {
    this.setData({
      isLoading: true
    });
    
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    const memberid = wx.getStorageSync('selectedMemberId') || '';
    
    request({
      url: config.getFullURL('clothing') + '/list',
      method: 'POST',
      data: {
        userid: userid,
        familyid: familyid,
        memberid: memberid,
        // 添加时间戳防止缓存
        _t: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          const clothingList = res.data.result || [];
          this.setData({
            clothingList: clothingList,
            filteredClothingList: clothingList,
            isLoading: false
          });
        } else {
          console.error('获取服装列表失败', res);
          this.setData({
            isLoading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取服装列表网络错误', err);
        this.setData({
          isLoading: false
        });
      }
    });
  },

  // 切换一级分类
  switchPrimaryCategory(e) {
    const category = e.currentTarget.dataset.category;
    
    // 如果点击的是已经选中的一级分类，则显示所有服装
    if (this.data.currentPrimaryCategory === category) {
      this.setData({
        currentPrimaryCategory: 'all',
        filteredClothingList: this.data.clothingList
      });
      return;
    }
    
    this.setData({
      currentPrimaryCategory: category
    });
    
    // 根据选中的一级分类筛选服装
    if (category === 'all') {
      this.setData({
        filteredClothingList: this.data.clothingList
      });
    } else {
      const filteredList = this.data.clothingList.filter(item => 
        item.primary_category == category
      );
      this.setData({
        filteredClothingList: filteredList
      });
    }
  },

  // 选择服装
  selectClothing(e) {
    const clothing = e.currentTarget.dataset.item;
    console.log('选择服装:', clothing);
    
    // 将选中的服装添加到Canvas中
    this.addClothingToCanvas(clothing);
  },

  // 将服装添加到Canvas中
  addClothingToCanvas(clothing) {
    const canvasItems = this.data.canvasItems;
    // 创建Canvas项
    const canvasItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), // 唯一ID
      clothingId: clothing.id,
      imageUrl: signedUrl,
      name: clothing.name,
      x: 50 + Math.random() * 100, // 随机位置
      y: 50 + Math.random() * 100,
      width: 80,
      height: 80,
      zIndex: canvasItems.length,
      isDragging: false
    };
    
    canvasItems.push(canvasItem);
    
    this.setData({
      canvasItems: canvasItems
    });
  },

  // 从Canvas中移除服装
  removeClothingFromCanvas(e) {
    const index = e.currentTarget.dataset.index;
    const canvasItems = this.data.canvasItems;
    
    canvasItems.splice(index, 1);
    
    this.setData({
      canvasItems: canvasItems
    });
  },

  // 开始拖拽
  startDrag(e) {
    const index = e.currentTarget.dataset.index;
    const canvasItems = this.data.canvasItems;
    
    // 记录拖拽起始位置
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    
    canvasItems[index].isDragging = true;
    canvasItems[index].startX = startX;
    canvasItems[index].startY = startY;
    
    this.setData({
      canvasItems: canvasItems,
      selectedClothingId: canvasItems[index].id
    });
  },

  // 拖拽中
  onDrag(e) {
    const selectedId = this.data.selectedClothingId;
    if (!selectedId) return;
    
    const canvasItems = this.data.canvasItems;
    const index = canvasItems.findIndex(item => item.id === selectedId);
    if (index === -1) return;
    
    // 计算移动距离
    const moveX = e.touches[0].clientX - canvasItems[index].startX;
    const moveY = e.touches[0].clientY - canvasItems[index].startY;
    
    // 更新位置
    canvasItems[index].x += moveX;
    canvasItems[index].y += moveY;
    
    // 更新起始位置
    canvasItems[index].startX = e.touches[0].clientX;
    canvasItems[index].startY = e.touches[0].clientY;
    
    this.setData({
      canvasItems: canvasItems
    });
  },

  // 结束拖拽
  endDrag(e) {
    const selectedId = this.data.selectedClothingId;
    if (!selectedId) return;
    
    const canvasItems = this.data.canvasItems;
    const index = canvasItems.findIndex(item => item.id === selectedId);
    if (index === -1) return;
    
    canvasItems[index].isDragging = false;
    
    this.setData({
      canvasItems: canvasItems,
      selectedClothingId: null
    });
  },

  // 保存穿搭
  saveOutfit() {
    if (this.data.canvasItems.length === 0) {
      wx.showToast({
        title: '请至少选择一件服装',
        icon: 'none'
      });
      return;
    }
    
    // TODO: 实现保存穿搭的逻辑
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});