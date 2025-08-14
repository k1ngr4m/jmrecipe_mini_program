const config = require('../../config/api.js');

Page({
  data: {
    title: '首页',
    showLoginPrompt: false
  },
  
  onLoad() {
    this.getUserCode()
  },

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
          // this.queryAndCreateFamily(userData.openid);
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


  goToClothing() {
    wx.navigateTo({
      url: '/pages/clothing/clothing'
    })
  },

  goToFood() {
    wx.navigateTo({
      url: '/pages/food/food'
    })
  },
  
  goToLiving() {
    wx.navigateTo({
      url: '/pages/living/living'
    })
  },
  
  goToTravel() {
    wx.navigateTo({
      url: '/pages/travel/travel'
    })
  }
})