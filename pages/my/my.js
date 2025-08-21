const app = getApp();
const config = require('../../config/api.js');
const {request} = require("../../utils/request");
const cosCredentialsManager = require("../../utils/cos-credentials-manager");

Page({
  data: {
    title: '我的',
    userInfo: null,
    familyName: null
  },

  onLoad() {
    this.fetchUserInfo()
    this.loadFamilyInfo()
  },

  onShow() {
    // 页面显示时重新加载用户信息
    // this.fetchUserInfo()
    // this.loadFamilyInfo()
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

  // 从接口获取用户信息
  fetchUserInfo() {
    const app = getApp()
    const hasLoggedIn = wx.getStorageSync('hasLoggedIn')
    
    if (hasLoggedIn) {

      // 发起请求获取用户详细信息
      request({
        url: app.globalData.getFullURL('user') + '/detail',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          userid: wx.getStorageSync('userid'),
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            // 从响应中提取用户信息
            const userInfo = {
              nickName: res.data.result.nickname,
            }

            const avatarUrl = res.data.result.avatar_url
            if (avatarUrl) {
              cosCredentialsManager.getSignedCosUrl(avatarUrl, (signedUrl) => {
                userInfo.avatarUrl = signedUrl;
            })
          }


            // 将用户信息存储到StorageSync
            wx.setStorageSync('userInfo', userInfo)
            // 更新全局数据
            app.globalData.userInfo = userInfo
            // 更新页面数据
            this.setData({
              userInfo: userInfo
            })
          } else {
            console.error('获取用户信息失败', res)
            // 如果接口获取失败，使用本地存储的信息
            this.loadStoredUserInfo()
          }
        },
        fail: (err) => {
          console.error('请求用户信息失败', err)
          // 如果请求失败，使用本地存储的信息
          this.loadStoredUserInfo()
        }
      })
    }
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
