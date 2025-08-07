// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查是否已经登录
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn') || false
    if (!hasLoggedIn) {
      // 首次打开小程序，设置需要登录的标志
      this.globalData.needLogin = true
    } else {
      // 已登录，获取用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
      }
    }
  },

  // 显示登录提示，需要用户主动触发
  showLoginPrompt() {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    })
  },


  // 仅执行微信登录获取code，不获取用户信息
  wxLogin(callback) {
    wx.login({
      success: (res) => {
        if (res.code) {
          typeof callback === "function" && callback(res.code)
        } else {
          console.error('登录失败！' + res.errMsg)
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('登录失败', err)
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      }
    })
  },

  // 保存用户信息到全局数据和本地存储
  saveUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('hasLoggedIn', true)
    this.globalData.needLogin = false
  },

  // 获取用户信息
  getUserInfo(cb) {
    if (this.globalData.userInfo) {
      typeof cb === "function" && cb(this.globalData.userInfo)
    } else {
      // 如果没有用户信息，尝试从本地存储获取
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.globalData.userInfo = userInfo
        typeof cb === "function" && cb(this.globalData.userInfo)
      }
    }
  },

  globalData: {
    userInfo: null,
    needLogin: false
  }
})