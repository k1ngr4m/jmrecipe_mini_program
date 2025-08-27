const config = require('../../../config/api.js');
const { request } = require('../../../utils/request.js');
const cosCredentialsManager = require("../../../utils/cos-credentials-manager");

Page({
  data: {
    title: '新建穿搭',
    outfitName: '', // 穿搭名称
    outfitType: '', // 穿搭类型
    outfitTypeOptions: [ // 穿搭类型选项
      { id: 0, name: '默认穿搭' },
      { id: 1, name: '日常穿搭' },
      { id: 2, name: '职业穿搭' },
      { id: 3, name: '排队穿搭' },
      { id: 4, name: '运动穿搭' },
      { id: 5, name: '季节穿搭' }
    ],
    // 分类数据
    primaryCategories: [], // 一级分类
    currentPrimaryCategory: 'all', // 当前选中的一级分类
    gender: 1, // 性别筛选
    // 服装列表数据
    clothingList: [], // 所有服装
    filteredClothingList: [], // 筛选后的服装列表
    // Canvas相关数据
    canvasItems: [], // Canvas中的服装项
    selectedClothingId: null, // 当前选中的服装ID
    // 页面状态
    isLoading: false, // 加载状态
    // Canvas操作相关
    canvasWidth: 300,
    canvasHeight: 300
  },

  onLoad() {
    // 页面加载时获取分类数据和服装列表
    this.getCategories();
    this.getClothingList();
    // 验证签名URL是否正确生成
    this.verifySignedUrls();
    // 初始化canvas
    this.initCanvas();
  },

  // 初始化canvas
  initCanvas() {
    // 获取canvas上下文
    const ctx = wx.createCanvasContext('outfitCanvas', this);
    
    // 设置背景色
    ctx.setFillStyle('#f5f5f5');
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制提示文字
    ctx.setFontSize(16);
    ctx.setFillStyle('#999');
    ctx.setTextAlign('center');
    ctx.fillText('请从上方选择服装添加到画布中', this.data.canvasWidth / 2, this.data.canvasHeight / 2);
    
    // 绘制到canvas
    ctx.draw();
    
    // 确保canvas在初始化时也重绘一次
    setTimeout(() => {
      this.redrawCanvas();
    }, 100);
  },

  // 验证签名URL是否正确生成
  verifySignedUrls() {
    // 延迟一段时间后检查签名URL是否已生成
    setTimeout(() => {
      const clothingList = this.data.clothingList;
      console.log('验证签名URL时的服装列表:', clothingList);
      
      const signedCount = clothingList.filter(item => item.signed_image_url && item.signed_image_url.includes('q-sign-algorithm')).length;
      const totalCount = clothingList.length;
      
      console.log(`签名URL统计: ${signedCount}/${totalCount} 个服装有签名URL`);
      
      if (signedCount > 0) {
        console.log('签名URL生成成功');
      } else {
        console.log('签名URL未生成或生成失败');
      }
    }, 3000); // 延迟3秒检查，确保异步操作完成
  },

  // 自定义函数解析URL查询参数
  parseQueryString(queryString) {
    const params = {};
    if (!queryString) return params;
    
    const pairs = queryString.split('&');
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i].split('=');
      const key = decodeURIComponent(pair[0] || '');
      const value = decodeURIComponent(pair[1] || '');
      params[key] = value;
    }
    return params;
  },

  // 检查签名URL是否有效
  isSignedUrlValid(signedUrl) {
    if (!signedUrl || !signedUrl.includes('q-sign-algorithm')) {
      return false;
    }
    
    // 检查URL是否过期
    const urlParts = signedUrl.split('?');
    if (urlParts.length < 2) {
      return false;
    }
    
    const queryParams = this.parseQueryString(urlParts[1]);
    const signTime = queryParams['q-sign-time'];
    
    if (!signTime) {
      return false;
    }
    
    // 获取过期时间（第二个时间戳）
    const timeParts = signTime.split(';');
    if (timeParts.length !== 2) {
      return false;
    }
    
    const expireTime = parseInt(timeParts[1]);
    const now = Math.floor(Date.now() / 1000);
    
    // 如果当前时间已经超过了过期时间，则URL无效
    return now < expireTime;
  },

  // 获取单个服装的签名URL
  getSignedImageUrl(clothing, callback) {
    console.log('获取签名URL，服装信息:', clothing);
    
    // 检查现有的签名URL是否有效
    if (clothing.signed_image_url && this.isSignedUrlValid(clothing.signed_image_url)) {
      console.log('使用现有的有效签名URL:', clothing.signed_image_url);
      // 如果已经有有效的签名URL，直接返回
      callback(clothing.signed_image_url);
    } else if (clothing.image_url) {
      console.log('获取新的签名URL，原始URL:', clothing.image_url);
      // 如果没有签名URL但有原始URL，则获取签名URL
      cosCredentialsManager.getSignedCosUrl(clothing.image_url, (signedUrl) => {
        console.log('获取到新的签名URL:', signedUrl);
        
        // 验证签名URL是否有效
        if (signedUrl && typeof signedUrl === 'string' && signedUrl.length > 0) {
          // 更新服装列表中的签名URL
          const updatedClothingList = this.data.clothingList.map(item => {
            if (item.id === clothing.id) {
              return {
                ...item,
                signed_image_url: signedUrl
              };
            }
            return item;
          });
          
          // 更新页面数据
          this.setData({
            clothingList: updatedClothingList,
            filteredClothingList: updatedClothingList
          });
          callback(signedUrl);
        } else {
          console.log('获取到的签名URL无效，使用原始URL:', clothing.image_url);
          callback(clothing.image_url);
        }
      });
    } else {
      console.log('没有可用的图片URL');
      // 如果都没有，返回空字符串
      callback('');
    }
  },

  // 处理COS签名URL
  processSignedUrls(clothingList) {
    // 收集所有需要签名的URL
    const urlsToSign = clothingList
      .filter(item => item.image_url && !this.isSignedUrlValid(item.signed_image_url))
      .map(item => item.image_url);
    
    // 如果没有需要签名的URL，直接设置数据并完成加载状态
    if (urlsToSign.length === 0) {
      this.setData({
        clothingList: clothingList,
        filteredClothingList: clothingList,
        isLoading: false
      });
      return;
    }
    
    // 使用COSCredentialsManager批量获取签名URL
    cosCredentialsManager.getBatchSignedCosUrls(urlsToSign, (signedUrlsMap) => {
      // 更新服装列表中的签名URL
      const updatedClothingList = clothingList.map(item => {
        if (item.image_url && signedUrlsMap[item.image_url]) {
          return {
            ...item,
            signed_image_url: signedUrlsMap[item.image_url]
          };
        }
        return item;
      });
      
      // 更新页面数据
      this.setData({
        clothingList: updatedClothingList,
        filteredClothingList: updatedClothingList,
        isLoading: false // 设置加载状态为完成
      });
      
      console.log('更新后的服装列表数量:', updatedClothingList.length);
    });
  },

  // 获取分类数据
  getCategories() {
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
          
          console.log('获取到的服装列表数量:', clothingList.length);
          // 对服装列表中的每个服装图片URL进行COS签名处理
          const signedClothingList = clothingList.map(clothing => {
            // 为每个服装项添加签名后的图片URL
            return {
              ...clothing,
              signed_image_url: clothing.signed_image_url || clothing.image_url // 如果已经有签名URL则保留，否则使用原始URL
            };
          });
          
          console.log('处理后的服装列表:', signedClothingList);
          // 异步获取签名URL并更新数据
          this.processSignedUrls(signedClothingList);
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
    this.getSignedImageUrl(clothing, (signedUrl) => {
      wx.getImageInfo({
        src: signedUrl,
        success: (res) => {
          // 新的 canvas item
          const newItem = {
            clothingId: clothing.id,
            imageUrl: res.path,   // 直接存本地路径
            x: 50,
            y: 50,
            width: 100,
            height: 100,
          };

          this.setData({
            canvasItems: [...this.data.canvasItems, newItem]
          }, () => {
            this.redrawCanvas();
          });
        },
        fail: (err) => {
          console.error('获取图片信息失败:', err);
        }
      });
    });
  },

  // 从Canvas中移除服装
  removeClothingFromCanvas(e) {
    const index = e.currentTarget.dataset.index;
    const canvasItems = this.data.canvasItems;
    
    canvasItems.splice(index, 1);
    
    this.setData({
      canvasItems: canvasItems,
      selectedClothingId: null
    });
    
    // 重新绘制canvas
    this.redrawCanvas();
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
    
    // 重新绘制canvas
    this.redrawCanvas();
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
      canvasItems: canvasItems
    });
  },

  // 放大选中的服装项
  scaleUp() {
    const selectedId = this.data.selectedClothingId;
    if (!selectedId) {
      wx.showToast({
        title: '请先选择一个服装项',
        icon: 'none'
      });
      return;
    }
    
    const canvasItems = this.data.canvasItems;
    const index = canvasItems.findIndex(item => item.id === selectedId);
    if (index === -1) return;
    
    // 增大尺寸（10%）
    canvasItems[index].width *= 1.1;
    canvasItems[index].height *= 1.1;
    
    this.setData({
      canvasItems: canvasItems
    });
    
    // 重新绘制canvas
    this.redrawCanvas();
  },

  // 缩小选中的服装项
  scaleDown() {
    const selectedId = this.data.selectedClothingId;
    if (!selectedId) {
      wx.showToast({
        title: '请先选择一个服装项',
        icon: 'none'
      });
      return;
    }
    
    const canvasItems = this.data.canvasItems;
    const index = canvasItems.findIndex(item => item.id === selectedId);
    if (index === -1) return;
    
    // 减小尺寸（10%）
    canvasItems[index].width *= 0.9;
    canvasItems[index].height *= 0.9;
    
    this.setData({
      canvasItems: canvasItems
    });
    
    // 重新绘制canvas
    this.redrawCanvas();
  },

  // 旋转选中的服装项
  rotate() {
    const selectedId = this.data.selectedClothingId;
    if (!selectedId) {
      wx.showToast({
        title: '请先选择一个服装项',
        icon: 'none'
      });
      return;
    }
    
    const canvasItems = this.data.canvasItems;
    const index = canvasItems.findIndex(item => item.id === selectedId);
    if (index === -1) return;
    
    // 增加旋转角度（15度）
    if (!canvasItems[index].rotation) {
      canvasItems[index].rotation = 0;
    }
    canvasItems[index].rotation += 15;
    
    this.setData({
      canvasItems: canvasItems
    });
    
    // 重新绘制canvas
    this.redrawCanvas();
  },

  // 重新绘制canvas（最终修复版本）
  redrawCanvas() {
    const ctx = wx.createCanvasContext('outfitCanvas', this);

    // 清空画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);

    // 绘制背景
    if (this.data.backgroundImagePath) {
      ctx.drawImage(
          this.data.backgroundImagePath,
          0,
          0,
          this.data.canvasWidth,
          this.data.canvasHeight
      );
    }

    // 绘制每个 clothing item
    this.data.canvasItems.forEach(item => {
      if (item.imageUrl) {
        ctx.drawImage(item.imageUrl, item.x, item.y, item.width, item.height);
      } else {
        console.warn('未找到本地图片路径:', item);
      }
    });

    ctx.draw();
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
    
    // 检查是否输入了穿搭名称
    if (!this.data.outfitName || this.data.outfitName.trim() === '') {
      wx.showToast({
        title: '请输入穿搭名称',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否选择了穿搭类型
    if (!this.data.outfitType) {
      wx.showToast({
        title: '请选择穿搭类型',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 将canvas转换为base64图片
    this.convertCanvasToBase64((base64Image) => {
      // 准备请求数据
      const requestData = {
        userid: wx.getStorageSync('userid') || '1',
        familyid: wx.getStorageSync('familyid') || '1',
        memberid: wx.getStorageSync('selectedMemberId') || '1',
        name: this.data.outfitName,
        type: this.getOutfitTypeIdByName(this.data.outfitType),
        clothing_ids: this.data.canvasItems.map(item => item.clothingId),
        image_url: base64Image,
        description: this.data.outfitName
      };
      
      console.log('保存穿搭请求数据:', requestData);
      
      // 调用API接口保存穿搭
      this.createOutfit(requestData);
    });
  },

  // 根据穿搭类型名称获取类型ID
  getOutfitTypeIdByName(typeName) {
    const typeMap = {
      '默认穿搭': 0,
      '日常穿搭': 1,
      '职业穿搭': 2,
      '排队穿搭': 3,
      '运动穿搭': 4,
      '季节穿搭': 5
    };
    return typeMap[typeName] !== undefined ? typeMap[typeName] : 0;
  },
  
  // 调用API接口创建穿搭
  createOutfit(data) {
    // 根据API要求调整请求参数格式
    const requestData = {
      userid: data.userid,
      familyid: data.familyid,
      memberid: data.memberid,
      name: data.name,
      type: data.type,
      clothing_ids: data.clothing_ids,
      image_url: data.image_url,
      description: data.description
    };
    
    request({
      url: config.getFullURL('outfit') + '/create',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        console.log('创建穿搭成功:', res);
        
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
          console.error('创建穿搭失败:', res);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        console.error('创建穿搭网络错误:', err);
      }
    });
  },
  
  // 将canvas转换为base64图片
  convertCanvasToBase64(callback) {
    const canvasItems = this.data.canvasItems;
    
    // 如果没有服装项，直接返回空白图片
    if (!canvasItems || canvasItems.length === 0) {
      // 创建一个空白的base64图片
      callback('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
      return;
    }
    
    // 获取canvas上下文
    const ctx = wx.createCanvasContext('outfitCanvas', this);
    
    // 设置背景色
    ctx.setFillStyle('#f5f5f5');
    ctx.fillRect(0, 0, 300, 300);
    
    // 绘制所有服装项到canvas上
    let drawCount = 0;
    const totalItems = canvasItems.length;
    
    if (totalItems === 0) {
      // 保存并导出canvas
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'outfitCanvas',
          success: (res) => {
            // 获取临时文件路径
            const tempFilePath = res.tempFilePath;
            
            // 读取文件内容并转换为base64
            wx.getFileSystemManager().readFile({
              filePath: tempFilePath,
              encoding: 'base64',
              success: (res) => {
                // 添加data URL前缀
                const base64Image = 'data:image/png;base64,' + res.data;
                callback(base64Image);
              },
              fail: (err) => {
                console.error('读取文件失败:', err);
                callback('');
              }
            });
          },
          fail: (err) => {
            console.error('canvas转临时文件路径失败:', err);
            callback('');
          }
        }, this);
      });
      return;
    }
    
    // 绘制每个服装项
    canvasItems.forEach((item, index) => {
      if (item.imageUrl) {
        ctx.drawImage(item.imageUrl, item.x, item.y, item.width, item.height);
        drawCount++;
        
        // 当所有图片都绘制完成时，保存并导出canvas
        if (drawCount === totalItems) {
          ctx.draw(false, () => {
            // 等待绘制完成后再导出
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'outfitCanvas',
                success: (res) => {
                  // 获取临时文件路径
                  const tempFilePath = res.tempFilePath;
                  
                  // 读取文件内容并转换为base64
                  wx.getFileSystemManager().readFile({
                    filePath: tempFilePath,
                    encoding: 'base64',
                    success: (res) => {
                      // 添加data URL前缀
                      const base64Image = 'data:image/png;base64,' + res.data;
                      callback(base64Image);
                    },
                    fail: (err) => {
                      console.error('读取文件失败:', err);
                      callback('');
                    }
                  });
                },
                fail: (err) => {
                  console.error('canvas转临时文件路径失败:', err);
                  callback('');
                }
              }, this);
            }, 100);
          });
        }
      } else {
        drawCount++;
        
        // 当所有图片都处理完成时，保存并导出canvas
        if (drawCount === totalItems) {
          ctx.draw(false, () => {
            // 等待绘制完成后再导出
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'outfitCanvas',
                success: (res) => {
                  // 获取临时文件路径
                  const tempFilePath = res.tempFilePath;
                  
                  // 读取文件内容并转换为base64
                  wx.getFileSystemManager().readFile({
                    filePath: tempFilePath,
                    encoding: 'base64',
                    success: (res) => {
                      // 添加data URL前缀
                      const base64Image = 'data:image/png;base64,' + res.data;
                      callback(base64Image);
                    },
                    fail: (err) => {
                      console.error('读取文件失败:', err);
                      callback('');
                    }
                  });
                },
                fail: (err) => {
                  console.error('canvas转临时文件路径失败:', err);
                  callback('');
                }
              }, this);
            }, 100);
          });
        }
      }
    });
  },

  // 更新穿搭名称
  onOutfitNameInput(e) {
    this.setData({
      outfitName: e.detail.value
    });
  },

  // 更新穿搭类型
  onOutfitTypeChange(e) {
    const selectedIndex = e.detail.value;
    const selectedType = this.data.outfitTypeOptions[selectedIndex];
    this.setData({
      outfitType: selectedType.name
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});