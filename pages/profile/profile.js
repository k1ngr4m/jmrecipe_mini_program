// profile.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      userId: '',
      phone: ''
    }
  },

  onLoad() {
    // In a real app, you would fetch user info from the server
    this.loadUserInfo()
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

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // Clear user info from storage
          wx.removeStorageSync('userInfo')
          
          // Reset to default user info
          this.setData({
            userInfo: {
              avatarUrl: defaultAvatarUrl,
              nickName: '',
              userId: '',
              phone: ''
            }
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
})