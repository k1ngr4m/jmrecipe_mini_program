// my.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      userId: ''
    },
    orders: [
      // Sample order data
      {
        id: '20230801001',
        status: 'completed',
        statusText: '已完成',
        date: '2023-08-01 12:30',
        amount: '88.50'
      },
      {
        id: '20230728002',
        status: 'pending',
        statusText: '待付款',
        date: '2023-07-28 19:15',
        amount: '126.00'
      }
    ]
  },

  onLoad() {
    // In a real app, you would fetch user info and orders from the server
    this.loadUserInfo()
    this.loadOrders()
  },

  loadUserInfo() {
    // Check if user info is already stored
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }
  },

  loadOrders() {
    // In a real app, you would fetch orders from the server
    // For now, we're using sample data
    console.log('Loading orders...')
  },

  onShow() {
    // Refresh user info when page shows
    this.loadUserInfo()
  },

  updateUserInfo() {
    // Navigate to profile page
    wx.navigateTo({
      url: '../profile/profile'
    })
  }
})