Page({
  data: {
    title: '智能衣橱',
    showModal: false,
    imageUrl: '',
    clothingList: [],
    purchaseDate: ''
  },
  
  onLoad() {
    // 页面加载时执行
    this.getClothingList();
  },
  
  showAddModal() {
    this.setData({
      showModal: true
    });
  },
  
  hideAddModal() {
    this.setData({
      showModal: false,
      imageUrl: '',
      purchaseDate: ''  // 清空日期选择
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
        
        // 模拟上传图片到服务器并获取URL
        // 实际开发中需要调用上传接口
        console.log('选择的图片路径:', tempFilePaths[0]);
      }
    });
  },
  
  bindDateChange: function(e) {
    this.setData({
      purchaseDate: e.detail.value
    });
  },
  
  addClothing(e) {
    const formData = e.detail.value;
    
    // 验证必填字段
    if (!formData.name || !formData.category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 构造请求数据
    const requestData = {
      user_id: 1, // 实际开发中需要获取当前用户ID
      name: formData.name,
      category: formData.category,
      color: formData.color || '',
      brand: formData.brand || '',
      purchase_date: this.data.purchaseDate || '',
      price: formData.price ? parseFloat(formData.price) : 0,
      image_url: this.data.imageUrl || '',
      tags: []
    };
    
    // 调用API创建衣物
    this.createClothing(requestData);
  },
  
  createClothing(data) {
    wx.request({
      url: 'http://0.0.0.0:8000/api/wardrobe/clothing',
      method: 'POST',
      data: data,
      success: (res) => {
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
          wx.showToast({
            title: '创建失败',
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
  
  getClothingList() {
    wx.request({
      url: 'http://0.0.0.0:8000/api/wardrobe/clothing?user_id=1',
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            clothingList: res.data
          });
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
  }
})