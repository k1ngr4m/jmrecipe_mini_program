const app = getApp();

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    this.getUserInfo()
  },

  onShow() {
    this.getUserInfo()
  },

  getUserInfo() {
    const app = getApp()
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }
  },

  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  goToEditProfile() {
    wx.navigateTo({
      url: '/pages/settings/profile-edit/profile-edit'
    })
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('hasLoggedIn')
          wx.removeStorageSync('userInfo')
          
          const app = getApp()
          app.globalData.userInfo = null
          app.globalData.needLogin = true
          
          // 跳转到"我的"页面
          wx.redirectTo({
            url: '/pages/my/my'
          })
        }
      }
    })
  }
})