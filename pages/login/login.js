// pages/login/login.js
const app = getApp();

Page({
  data: {
    // 页面数据
    showPrivacy: false,
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
  },

  /**
   * 页面加载
   */
  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log("userInfo",res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        app.globalData.userInfo = res.userInfo;
        app.globalData.hasLoggedIn = true; // 设置登录状态
        wx.setStorageSync('hasLoggedIn', true); // 保存登录状态到本地存储
        wx.setStorageSync('userInfo', res.userInfo); // 保存openid到本地存储
        console.log('登录成功，跳转到首页');
        // 跳转到首页
        wx.reLaunch({
          url: '/pages/index/index',
        });
      }
    })
  },

  /**
   * 实际登录函数
   */
  _login() {
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
      fail: (err) => {
        console.error('wx.login调用失败', err);
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 请求后端登录接口
   */
  loginRequest(code) {
    wx.request({
      url: app.globalData.getFullURL('login'), // 后端接口地址
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
        if (resServer.data.errcode === "0") {
          // 登录成功
          const userData = resServer.data;
          
          // 保存用户信息到全局变量和本地存储
          app.globalData.openid = userData.openid;
          app.globalData.session_key = userData.session_key;
          app.globalData.unionid = userData.unionid;
          app.globalData.hasLoggedIn = true; // 设置登录状态
          wx.setStorageSync('hasLoggedIn', true); // 保存登录状态到本地存储
          wx.setStorageSync('openid', userData.openid); // 保存openid到本地存储
          
          console.log('登录成功，跳转到首页');
          
          // 跳转到首页
          wx.reLaunch({
            url: '/pages/index/index',
          });
        } else {
          // 登录失败
          wx.showToast({
            title: resServer.data.msg || '登录失败',
            icon: 'none'
          });
          console.error("登录失败:", resServer.data.msg);
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
  }
});