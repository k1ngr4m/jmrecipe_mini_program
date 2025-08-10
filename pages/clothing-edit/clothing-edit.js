const config = require('../../config/api.js');
const COS = require('../../utils/cos-wx-sdk-v5.js');
const cosCredentialsManager = require('../../utils/cos-credentials-manager.js');

Page({
  data: {
    clothingId: null,
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    name: '',
    category: '',
    color: '',
    colorIndex: 0,
    colorOptions: ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '黑色', '白色', '混合色'],
    brand: '',
    price: '',
    purchaseDate: '',
  },

  onLoad: function (options) {
    const clothingId = options.id;
    if (clothingId) {
      this.setData({
        clothingId: clothingId
      });
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
        user_id: 1
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const clothing = res.data;
          
          // 设置表单数据
          this.setData({
            name: clothing.name || '',
            category: clothing.category || '',
            color: clothing.color || '',
            brand: clothing.brand || '',
            price: clothing.price || '',
            purchaseDate: clothing.purchase_date || '',
            imageUrl: clothing.image_url || '',
            cosImageUrl: clothing.image_url || ''
          });
          
          // 设置颜色索引
          if (clothing.color) {
            const colorIndex = this.data.colorOptions.indexOf(clothing.color);
            if (colorIndex !== -1) {
              this.setData({
                colorIndex: colorIndex
              });
            }
          }
        } else if (res.statusCode === 404) {
          wx.showToast({
            title: '衣物不存在',
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

  onColorChange: function(e) {
    const colorIndex = e.detail.value;
    const color = this.data.colorOptions[colorIndex];
    this.setData({
      colorIndex: colorIndex,
      color: color
    });
  },

  // 更新衣物信息
  updateClothing: function(e) {
    const that = this;
    const clothingId = this.data.clothingId;
    
    // 构造表单数据
    const formData = {
      name: this.data.name || '',
      category: this.data.category || '',
      color: this.data.color || '',
      brand: this.data.brand || '',
      price: this.data.price || '',
      purchase_date: this.data.purchaseDate || '',
      image_url: this.data.cosImageUrl || ''
    };
    
    // 验证必填字段
    if (!formData.name || !formData.category) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 发送更新请求
    wx.request({
      url: config.getFullURL('clothing') + `/${clothingId}?user_id=1`,
      method: 'PUT',
      data: formData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
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
  }
});