const app = getApp();

Page({
  data: {
    title: '我的',
    userInfo: null,
    familyName: null,
  },

  onLoad() {
    // 页面加载时，无论是否已登录都调用getUserCode()
    this.getUserCode()
    // 加载family信息
    this.loadFamilyInfo()
  },

  // 加载family信息
  loadFamilyInfo() {
    const familyName = wx.getStorageSync('family_name')
    if (familyName) {
      this.setData({
        familyName: familyName
      })
    }
  },

  // 从本地存储加载用户信息
  loadStoredUserInfo() {
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    if (!hasLoggedIn) {
      this.getUserCode()
    }
    if (hasLoggedIn) {
      // 已登录，更新全局状态
      const app = getApp()
      app.globalData.hasLoggedIn = true
      
      // 从全局数据中获取用户信息
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      
      console.log('加载用户信息:', userInfo);
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          tempAvatarUrl: userInfo.avatarUrl || '',
          tempNickname: userInfo.nickName || ''
        })
        
        console.log('设置用户数据:', {
          userInfo: userInfo,
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName,
          shouldShowGuide: !userInfo.avatarUrl || !userInfo.nickName || userInfo.nickName === '微信用户'
        });
      }
    }
  },

  // 用户点击登录按钮时触发 - 直接调用getUserProfile（先不用）
  // onLoginTap() {
  //   wx.getUserProfile({
  //     desc: '用于完善用户资料',
  //     success: (profileRes) => {
  //       // 获取用户信息后再获取登录code
  //       this.getUserCode(profileRes.userInfo);
  //     },
  //     fail: (err) => {
  //       console.error('获取用户信息失败', err)
  //       wx.showToast({
  //         title: '登录取消或失败',
  //         icon: 'none'
  //       })
  //     }
  //   })
  // },

  getUserCode() {
    // 直接调用wx.login获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          const code = res.code;
          console.log('获取到code:', code);
          // 请求后端接口进行登录
          this.loginRequest(code);
        } else {
          console.error('登录失败！' + res.errMsg);
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
        }
      },
    })
  },

  // 请求后端登录接口
  loginRequest(code) {
    const config = require('../../config/api.js');
    wx.request({
      url: config.getFullURL('login'), // 后端接口地址
      method: 'POST',
      data: {
        code: code
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      success: (resServer) => {
        console.log('请求成功', resServer);
        // 检查登录是否成功
        if (resServer.data && resServer.data.errcode === "0") {
          // 登录成功
          const userData = resServer.data;
          
          // 构造用户信息对象
          const userInfo = {
            nickName: userData.nickname,
            avatarUrl: userData.avatar_url,
            userid: userData.openid
          };
          
          // 保存用户信息到全局变量和本地存储
          const app = getApp();
          if (app.globalData) {
            app.globalData.userInfo = userInfo;
            app.globalData.userid = userData.openid;
            app.globalData.session_key = userData.session_key;
            app.globalData.unionid = userData.unionid;
            app.globalData.hasLoggedIn = true; // 设置登录状态
          }
          
          wx.setStorageSync('hasLoggedIn', true); // 保存登录状态到本地存储
          wx.setStorageSync('userInfo', userInfo); // 保存用户信息到本地存储
          wx.setStorageSync('userid', userData.openid); // 保存openid为userid到本地存储
          
          console.log('登录成功，更新用户信息');
          
          // 更新页面数据
          this.setData({
            userInfo: userInfo
          });
          
          // 查询并创建family信息
          this.queryAndCreateFamily(userData.openid);
        } else {
          // 登录失败
          wx.showToast({
            title: (resServer.data && resServer.data.errmsg) || '登录失败',
            icon: 'none'
          });
          console.error("登录失败:", resServer.data && resServer.data.errmsg);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络异常',
          icon: 'none'
        });
        console.error("请求失败:", err);
      }
    });
  },

  logout() {
    const app = getApp()
    if (app.globalData.userInfo) {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: (res) => {
          if (res.confirm) {
            // 清除登录状态
            wx.removeStorageSync('hasLoggedIn')
            wx.removeStorageSync('userInfo')

            app.globalData.userInfo = null
            app.globalData.needLogin = true

            // 更新页面数据
            this.setData({
              userInfo: null,
              tempAvatarUrl: '',
              tempNickname: ''
            })

            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      })
    }
  },

  // 跳转到成员管理页面
  goToMemberManagement() {
    wx.navigateTo({
      url: '/pages/member/member'
    });
  },
  
  // 跳转到品牌管理页面
  goToBrandManagement() {
    wx.navigateTo({
      url: '/pages/brand/brand'
    });
  },
  
  // 跳转到分类管理页面
  goToCategoryManagement() {
    // 分类管理功能将在后续版本中实现
    wx.showToast({
      title: '分类管理功能正在开发中',
      icon: 'none'
    });
  },
  
  // 查询并创建family信息
  queryAndCreateFamily(openid) {
    const config = require('../../config/api.js');
    
    // 查询用户family信息
    wx.request({
      url: config.getFullURL('familyQuery'),
      method: 'POST',
      data: {
        openid: openid
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const familyData = res.data;
          
          // 保存family信息到本地存储
          wx.setStorageSync('familyid', familyData.familyid);
          wx.setStorageSync('family_name', familyData.family_name);
          
          // 更新页面显示
          this.setData({
            familyName: familyData.family_name
          });
          
          console.log('查询到family信息:', familyData);
        } else {
          // 如果没有family信息，则创建新的family
          // this.createFamily(openid);
        }
      },
      fail: (err) => {
        console.error('查询family信息失败:', err);
        // 即使查询失败，也尝试创建family
        // this.createFamily(openid);
      }
    });
  },
  
  // 创建新的family
  createFamily(openid) {
    const config = require('../../config/api.js');
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 准备family数据
    const familyData = {
      openid: openid,
      family_name: userInfo.nickName ? `${userInfo.nickName}的家庭` : '我的家庭'
    };
    
    wx.request({
      url: config.getFullURL('familyCreate'),
      method: 'POST',
      data: familyData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          // 保存新创建的family信息到本地存储
          wx.setStorageSync('family_id', res.data.family_id);
          wx.setStorageSync('family_name', res.data.family_name);
          
          // 更新页面显示
          this.setData({
            familyName: res.data.family_name
          });
          
          console.log('创建family成功:', res.data);
        } else {
          console.error('创建family失败:', res);
        }
      },
      fail: (err) => {
        console.error('创建family请求失败:', err);
      }
    });
  },
})
