// my.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const { getOrders } = require('../../utils/api.js')

Page({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
      userId: ''
    },
    orders: []
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
    getOrders()
      .then(res => {
        console.log('Orders API response:', res)
        if (res.code === 200) {
          // Process orders data and take only the first 2 for display
          const processedOrders = this.processOrders(res.data).slice(0, 2)
          this.setData({
            orders: processedOrders
          })
        } else {
          throw new Error(res.message || '获取订单失败')
        }
      })
      .catch(err => {
        console.error('Failed to load orders:', err)
        // Use sample data as fallback
        this.setData({
          orders: [
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
        })
      })
  },

  processOrders(orders) {
    return orders.map(order => {
      // Parse dish_ids from JSON string
      let dishIds = [];
      try {
        dishIds = JSON.parse(order.dish_ids);
      } catch (e) {
        console.error('Failed to parse dish_ids:', e)
      }
      
      return {
        id: order.id,
        status: 'completed', // Default status
        statusText: '已完成', // Default status text
        date: this.formatDate(order.created_at),
        amount: order.total_price,
        dishIds: dishIds
      }
    })
  },

  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
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