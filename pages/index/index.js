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