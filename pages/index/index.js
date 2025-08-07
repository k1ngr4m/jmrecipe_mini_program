Page({
  data: {
    title: '首页',
    showLoginPrompt: false
  },
  
  onLoad() {
    // 页面加载时检查是否需要提示登录
    const app = getApp()
    if (app.globalData.needLogin) {
      this.setData({
        showLoginPrompt: true
      })
    }
  },
  
  // 用户点击登录按钮时触发
  onLoginTap() {
    this.userLogin()
  },
  
  // 用户主动触发的登录 - 直接调用wx.getUserProfile
  userLogin() {
    const app = getApp()
    // 先获取登录code
    app.wxLogin((code) => {
      if (code) {
        // 直接调用wx.getUserProfile，确保是由用户点击触发的
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            // 保存用户信息
            app.saveUserInfo(res.userInfo)
            console.log('用户登录成功', res.userInfo)
            
            // 隐藏登录提示
            this.setData({
              showLoginPrompt: false
            })
            
            // 这里可以将用户信息和code发送到后端服务器
            // 例如: this.sendUserInfoToServer(code, res.userInfo)
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
          },
          fail: (err) => {
            console.error('获取用户信息失败', err)
            wx.showToast({
              title: '登录取消或失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },
  
  checkLoginStatus() {
    const app = getApp()
    if (!app.globalData.userInfo) {
      // 用户未登录，显示登录提示
      wx.showModal({
        title: '提示',
        content: '请先登录以获得更好的体验',
        showCancel: true,
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.userLogin()
          }
        }
      })
      return false
    }
    return true
  },
  
  goToClothing() {
    if (this.checkLoginStatus()) {
      wx.navigateTo({
        url: '/pages/clothing/clothing'
      })
    }
  },
  
  goToFood() {
    if (this.checkLoginStatus()) {
      wx.navigateTo({
        url: '/pages/food/food'
      })
    }
  },
  
  goToLiving() {
    if (this.checkLoginStatus()) {
      wx.navigateTo({
        url: '/pages/living/living'
      })
    }
  },
  
  goToTravel() {
    if (this.checkLoginStatus()) {
      wx.navigateTo({
        url: '/pages/travel/travel'
      })
    }
  }
})