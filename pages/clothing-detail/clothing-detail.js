Page({
  data: {
    clothing: null,
    isLoading: true
  },

  onLoad: function (options) {
    const clothingId = options.id;
    if (clothingId) {
      this.getClothingDetail(clothingId);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
    }
  },

  // 获取服装详情
  getClothingDetail: function (clothingId) {
    wx.request({
      url: `http://0.0.0.0:8000/api/wardrobe/clothing/${clothingId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            clothing: res.data,
            isLoading: false
          });
        } else if (res.statusCode === 404) {
          wx.showToast({
            title: '衣物不存在',
            icon: 'none'
          });
          wx.navigateBack();
        } else {
          wx.showToast({
            title: '获取详情失败',
            icon: 'none'
          });
          wx.navigateBack();
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        wx.navigateBack();
      }
    });
  }
});