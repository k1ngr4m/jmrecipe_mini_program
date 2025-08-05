// orders.js
const { getOrders } = require('../../utils/api.js')

Page({
  data: {
    orders: [],
    loading: true
  },

  onLoad() {
    this.loadOrders()
  },

  loadOrders() {
    wx.showLoading({
      title: '加载中...'
    })
    
    getOrders()
      .then(res => {
        console.log('Orders API response:', res)
        if (res.code === 200) {
          // Process orders data
          const processedOrders = this.processOrders(res.data)
          this.setData({
            orders: processedOrders,
            loading: false
          })
        } else {
          throw new Error(res.message || '获取订单失败')
        }
      })
      .catch(err => {
        console.error('Failed to load orders:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({
          loading: false
        })
      })
      .finally(() => {
        wx.hideLoading()
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

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})