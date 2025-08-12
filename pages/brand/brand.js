const config = require('../../config/api.js');

Page({
  data: {
    brands: [],
    filteredBrands: [], // 用于显示筛选后的品牌列表
    showModal: false,
    isEditing: false,
    currentBrand: null,
    name: '',
    searchKeyword: ''
  },

  onLoad() {
    this.getBrandList();
  },

  // 获取品牌列表
  getBrandList() {
    wx.request({
      url: config.getFullURL('clothing') + '/brands/list',
      method: 'POST',
      data: {},
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            brands: res.data || [],
            filteredBrands: res.data || [] // 初始化筛选列表
          });
        } else {
          wx.showToast({
            title: '获取品牌列表失败',
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

  // 搜索品牌
  searchBrands() {
    const keyword = this.data.searchKeyword.trim();
    
    // 如果搜索关键词为空，显示所有品牌
    if (!keyword) {
      this.setData({
        filteredBrands: this.data.brands
      });
      return;
    }
    
    // 调用搜索API
    wx.request({
      url: config.getFullURL('clothing') + '/brands/search',
      method: 'POST',
      data: {
        keyword: keyword
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            filteredBrands: res.data || []
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

  // 输入搜索关键词
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    
    // 实时搜索（防抖）
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchBrands();
    }, 300);
  },

  // 获取品牌详情
  getBrandDetail(brandId, callback) {
    wx.request({
      url: config.getFullURL('clothing') + '/brands/detail',
      method: 'POST',
      data: {
        brand_id: brandId
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          typeof callback === 'function' && callback(res.data);
        } else {
          wx.showToast({
            title: '获取品牌详情失败',
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

  // 显示新增/编辑品牌弹窗
  showBrandModal(e) {
    const brand = e.currentTarget.dataset.brand;
    this.setData({
      showModal: true,
      isEditing: !!brand,
      currentBrand: brand || null,
      name: brand ? brand.name : ''
    });
  },

  // 隐藏弹窗
  hideBrandModal() {
    this.setData({
      showModal: false,
      isEditing: false,
      currentBrand: null,
      name: ''
    });
  },

  // 输入事件处理
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  // 保存品牌
  saveBrand() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入品牌名称',
        icon: 'none'
      });
      return;
    }

    // 创建品牌
    if (!this.data.isEditing) {
      const requestData = {
        name: this.data.name.trim()
      };

      wx.request({
        url: config.getFullURL('clothing') + '/brands/add',
        method: 'POST',
        data: requestData,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            wx.showToast({
              title: '创建成功',
              icon: 'success'
            });
            
            // 关闭弹窗
            this.hideBrandModal();
            
            // 刷新列表
            this.getBrandList();
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
    } else {
      // 更新品牌
      const requestData = {
        brand_id: this.data.currentBrand.id,
        brand_update: {
          name: this.data.name.trim()
        }
      };

      wx.request({
        url: config.getFullURL('clothing') + '/brands/update',
        method: 'POST',
        data: requestData,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            wx.showToast({
              title: '更新成功',
              icon: 'success'
            });
            
            // 关闭弹窗
            this.hideBrandModal();
            
            // 刷新列表
            this.getBrandList();
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
    }
  },

  // 删除品牌
  deleteBrand(e) {
    const brand = e.currentTarget.dataset.brand;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除品牌"${brand.name}"吗？此操作不可撤销。`,
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: config.getFullURL('clothing') + '/brands/delete',
            method: 'POST',
            data: {
              brand_id: brand.id
            },
            header: {
              'Content-Type': 'application/json'
            },
            success: (res) => {
              if (res.statusCode === 200) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 刷新列表
                this.getBrandList();
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
        }
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
})