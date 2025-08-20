const app = getApp();
const config = require('../../config/api.js');

Page({
  data: {
    title: '我的',
    userInfo: null,
    familyName: null,
    userDetail: null, // 用户详细信息
  },

  onLoad() {
    this.loadStoredUserInfo()
    this.loadFamilyInfo()
  },

  onShow() {
    // 页面显示时重新加载用户信息
    this.loadStoredUserInfo()
    this.loadFamilyInfo()
    // 获取用户详细信息
    this.getUserDetail()
  },

  // 加载family信息
  loadFamilyInfo() {
    const familyName = wx.getStorageSync('family_name')
    if (familyName) {
      this.setData({
        familyName: familyName
      })
    }
  },
  
  // 从本地存储加载用户信息
  loadStoredUserInfo() {
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    if (hasLoggedIn) {
      // 已登录，更新全局状态
      const app = getApp()
      app.globalData.hasLoggedIn = true
      
      // 从全局数据中获取用户信息
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo
        })
      }
    }
  },
  
  // 获取用户详细信息
  getUserDetail() {
    const userid = wx.getStorageSync('userid')
    if (!userid) {
      console.log('用户未登录，无法获取详细信息')
      return
    }
    
    wx.request({
      url: config.getFullURL('userDetail'),
      method: 'GET',
      data: {
        userid: userid
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 1) {
          console.log('获取用户详细信息成功:', res.data.result)
          this.setData({
            userDetail: res.data.result
          })
        } else {
          console.error('获取用户详细信息失败:', res)
        }
      },
      fail: (err) => {
        console.error('获取用户详细信息网络错误:', err)
      }
    })
  },

  // 用户点击登录按钮时触发
  onLoginTap() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        // 保存用户信息到全局和本地存储
        const app = getApp()
        app.globalData.userInfo = profileRes.userInfo
        app.globalData.hasLoggedIn = true
        wx.setStorageSync('userInfo', profileRes.userInfo)
        wx.setStorageSync('hasLoggedIn', true)
        
        // 更新页面数据
        this.setData({
          userInfo: profileRes.userInfo
        })
        
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
  },

  // 跳转到个人资料页面
  goToProfile() {
    wx.navigateTo({
      url: '/pages/settings/profile/profile'
    });
  },

  logout() {
    const app = getApp()
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('hasLoggedIn')
          wx.removeStorageSync('userInfo')

          app.globalData.userInfo = null
          app.globalData.needLogin = true

          // 更新页面数据
          this.setData({
            userInfo: null
          })

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 跳转到成员管理页面
  goToMemberManagement() {
    wx.navigateTo({
      url: '/pages/settings/member/member-list/member-list'
    });
  },
  
  // 跳转到品牌管理页面
  goToBrandManagement() {
    wx.navigateTo({
      url: '/pages/settings/brand/brand'
    });
  },
  
  // 跳转到分类管理页面
  goToCategoryManagement() {
    // 分类管理功能将在后续版本中实现
    wx.showToast({
      title: '分类管理功能正在开发中',
      icon: 'none'
    });
  },

})
