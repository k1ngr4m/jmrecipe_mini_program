const COS = require('../../utils/cos-wx-sdk-v5.js');

Page({
  data: {
    title: '智能衣橱',
    showModal: false,
    imageUrl: '',
    cosImageUrl: '',  // COS图片URL
    clothingList: [],
    purchaseDate: '',
    name: '',
    category: '',
    color: '',
    brand: '',
    price: ''
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
      cosImageUrl: '',  // 清空COS图片URL
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
  
  onColorInput: function(e) {
    this.setData({
      color: e.detail.value
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
      url: 'http://localhost:8000/api/cos/credentials',
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
          const key = `clothing/${timestamp}_${random}.${ext}`;
          
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
      url: 'http://0.0.0.0:8000/api/wardrobe/clothing?user_id=' + user_id,
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
      url: 'http://0.0.0.0:8000/api/wardrobe/clothing?user_id=1',
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const clothingList = res.data;
          
          // 为列表中的每个服装项获取带签名的图片URL
          let processedCount = 0;
          const totalItems = clothingList.length;
          
          if (totalItems === 0) {
            this.setData({
              clothingList: clothingList
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
                    clothingList: clothingList
                  });
                }
              });
            } else {
              processedCount++;
              
              // 当所有项都处理完后更新数据
              if (processedCount === totalItems) {
                this.setData({
                  clothingList: clothingList
                });
              }
            }
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
  },

  // 获取带签名的COS图片URL
  getSignedCosUrl: function(cosUrl, callback) {
    // 如果URL已经包含签名信息，则直接返回
    if (cosUrl && cosUrl.includes('q-sign-algorithm')) {
      callback(cosUrl);
      return;
    }
    
    // 从URL中提取Bucket、Region和Key信息
    // URL格式: https://jmrecipe-1309147067.cos.ap-shanghai.myqcloud.com/clothing/1754496891594_6800.png
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
    
    // 获取临时密钥
    wx.request({
      url: 'http://localhost:8000/api/cos/credentials',
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
        } else {
          console.error('获取临时密钥失败:', res);
          callback(cosUrl); // 如果获取失败，返回原始URL
        }
      },
      fail: (err) => {
        console.error('获取临时密钥失败:', err);
        callback(cosUrl); // 如果获取失败，返回原始URL
      }
    });
  },
  
  // 跳转到详情页
  goToDetail: function(e) {
    const clothingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/clothing-detail/clothing-detail?id=${clothingId}`
    });
  }
})