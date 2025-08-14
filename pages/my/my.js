const app = getApp();

Page({
  data: {
    title: '我的',
    userInfo: null,
    familyName: null,
  },

  onLoad() {
    this.loadStoredUserInfo()
    this.loadFamilyInfo()
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
    if (!hasLoggedIn) {
      this.getUserCode()
    }
    if (hasLoggedIn) {
      // 已登录，更新全局状态
      const app = getApp()
      app.globalData.hasLoggedIn = true
      
      // 从全局数据中获取用户信息
      const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
      
      console.log('加载用户信息:', userInfo);
      
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          tempAvatarUrl: userInfo.avatarUrl || '',
          tempNickname: userInfo.nickName || ''
        })
        
        console.log('设置用户数据:', {
          userInfo: userInfo,
          avatarUrl: userInfo.avatarUrl,
          nickName: userInfo.nickName,
          shouldShowGuide: !userInfo.avatarUrl || !userInfo.nickName || userInfo.nickName === '微信用户'
        });
      }
    }
  },

  // 用户点击登录按钮时触发 - 直接调用getUserProfile（先不用）
  onLoginTap() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        // 获取用户信息后再获取登录code
        this.getUserCode(profileRes.userInfo);
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

  logout() {
    const app = getApp()
    if (app.globalData.userInfo) {
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
              userInfo: null,
              tempAvatarUrl: '',
              tempNickname: ''
            })

            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          }
        }
      })
    }
  },

  // 跳转到成员管理页面
  goToMemberManagement() {
    wx.navigateTo({
      url: '/pages/member/member'
    });
  },
  
  // 跳转到品牌管理页面
  goToBrandManagement() {
    wx.navigateTo({
      url: '/pages/brand/brand'
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
