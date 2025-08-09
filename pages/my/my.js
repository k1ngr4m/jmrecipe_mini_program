Page({
  data: {
    title: '我的',
    userInfo: null,
    tempAvatarUrl: '',
    tempNickname: ''
  },

  onLoad() {
    // 页面加载时，从本地存储获取用户信息
    this.loadStoredUserInfo()
    
    // 如果没有登录，则触发登录
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn') || false
    // if (!hasLoggedIn) {
    //   this.onLoginTap()
    // }
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

  // 用户点击登录按钮时触发 - 直接调用getUserProfile
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

  // 单独获取登录code的方法
  getUserCode(userInfo) {
    const app = getApp()
    wx.login({
      success: (res) => {
        if (res.code) {
          // 保存用户信息到全局数据和本地存储
          app.globalData.userInfo = userInfo
          wx.setStorageSync('userInfo', userInfo)
          wx.setStorageSync('hasLoggedIn', true)
          app.globalData.needLogin = false

          // 更新页面数据
          this.setData({
            userInfo: userInfo
          })

          console.log('用户登录成功', userInfo)

          // 这里可以将用户信息和code发送到后端服务器
          // 例如: this.sendUserInfoToServer(res.code, userInfo)

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
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

  goToProfile() {
    const app = getApp()
    if (!app.globalData.userInfo) {
      // 未登录，直接触发用户信息授权
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (profileRes) => {
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
      return
    }

    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 处理用户选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatarUrl: avatarUrl
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        this.setData({
          tempAvatarUrl: tempFilePaths[0]
        })
      },
      fail: (err) => {
        console.error('选择头像失败', err)
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        })
      }
    })
  },

  // 提交昵称
  onSubmitNickname(e) {
    const { nickname } = e.detail.value
    if (!nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({
      tempNickname: nickname
    })

    // 更新用户信息
    this.updateUserInfo()
  },

  // 更新用户信息
  updateUserInfo() {
    const { tempAvatarUrl, tempNickname } = this.data
    const app = getApp()

    // 更新全局用户信息
    if (app.globalData.userInfo) {
      app.globalData.userInfo.avatarUrl = tempAvatarUrl
      app.globalData.userInfo.nickName = tempNickname
    }

    // 更新本地存储
    const userInfo = wx.getStorageSync('userInfo') || {}
    userInfo.avatarUrl = tempAvatarUrl
    userInfo.nickName = tempNickname
    wx.setStorageSync('userInfo', userInfo)

    // 更新页面数据
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        avatarUrl: tempAvatarUrl,
        nickName: tempNickname
      }
    })

    wx.showToast({
      title: '资料更新成功',
      icon: 'success'
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
  }
})
