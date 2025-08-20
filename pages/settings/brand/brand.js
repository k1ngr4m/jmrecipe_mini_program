const config = require('../../../config/api.js');

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
    const familyid = wx.getStorageSync('familyid');
    wx.request({
      url: config.getFullURL('clothing') + '/brands/list',
      method: 'POST',
      data: {
        familyid: familyid
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          // 确保"其他"品牌始终存在且在第一个位置
          let brands = res.data.result || [];
          const hasOtherBrand = brands.some(brand => brand.name === '其他');
          
          // 如果没有"其他"品牌，则添加一个到第一个位置
          if (!hasOtherBrand) {
            brands.unshift({
              id: 'other',
              name: '其他',
              isSystem: true // 标记为系统品牌，不可编辑删除
            });
          } else {
            // 如果有"其他"品牌，确保它在第一个位置
            const otherBrandIndex = brands.findIndex(brand => brand.name === '其他');
            if (otherBrandIndex > 0) {
              // 将"其他"品牌移动到第一个位置
              const otherBrand = brands.splice(otherBrandIndex, 1)[0];
              otherBrand.isSystem = true;
              brands.unshift(otherBrand);
            } else if (otherBrandIndex === 0) {
              // 如果已经在第一个位置，标记为系统品牌
              brands[0].isSystem = true;
            }
          }
          
          this.setData({
            brands: brands,
            filteredBrands: brands // 初始化筛选列表
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
        keyword: keyword,
        familyid: wx.getStorageSync('familyid')
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
    const name = this.data.name.trim();
    
    if (!name) {
      wx.showToast({
        title: '请输入品牌名称',
        icon: 'none'
      });
      return;
    }

    // 检查是否尝试创建或编辑为"其他"品牌（除了系统默认的）
    if (name === '其他' && (!this.data.isEditing || !this.data.currentBrand.isSystem)) {
      wx.showToast({
        title: '不能创建或修改为"其他"品牌',
        icon: 'none'
      });
      return;
    }

    // 创建品牌
    if (!this.data.isEditing) {
      // 检查是否已存在同名品牌
      const existingBrand = this.data.brands.find(brand => brand.name === name);
      if (existingBrand && !existingBrand.isSystem) {
        wx.showToast({
          title: '品牌已存在',
          icon: 'none'
        });
        return;
      }
      
      const requestData = {
        name: name,
        familyid: wx.getStorageSync('familyid') || '',
        logo_url: ''
      };

      wx.request({
        url: config.getFullURL('clothing') + '/brands/create',
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
      // 如果是系统品牌"其他"，不允许更新
      if (this.data.currentBrand.isSystem) {
        wx.showToast({
          title: '系统品牌不能修改',
          icon: 'none'
        });
        return;
      }
      
      // 检查是否已存在同名品牌
      const existingBrand = this.data.brands.find(brand => brand.name === name && brand.id !== this.data.currentBrand.id);
      if (existingBrand) {
        wx.showToast({
          title: '品牌已存在',
          icon: 'none'
        });
        return;
      }
      
      const requestData = {
        brand_id: this.data.currentBrand.id,
        brand_update: {
          name: name
        },
        familyid: wx.getStorageSync('familyid') || '',
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
    
    // 如果是系统品牌"其他"，不允许删除
    if (brand.isSystem) {
      wx.showToast({
        title: '系统品牌不能删除',
        icon: 'none'
      });
      return;
    }
    
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
              brand_id: brand.id,
              familyid: wx.getStorageSync('familyid') || '',
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