Page({
  data: {
    title: '首页'
  },
  onLoad() {
    // 页面加载时执行
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