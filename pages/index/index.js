// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const { getDishes } = require('../../utils/api.js')

Page({
  data: {
    motto: '点菜下单',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    // Menu data
    menuData: [],
    // Shopping cart
    cart: [],
    cartVisible: false,
    // Current category
    currentCategory: 0,
    // Total price
    totalPrice: 0,
    totalItems: 0,
    // Loading state
    loading: true
  },

  // Load menu data from API
  loadMenuData() {
    wx.showLoading({
      title: '加载中...'
    })
    
    getDishes()
      .then(res => {
        console.log('API Response:', res)
        if (res.code === 200) {
          // Group dishes by category
          const groupedDishes = this.groupDishesByCategory(res.data)
          console.log('Grouped dishes:', groupedDishes)
          this.setData({
            menuData: groupedDishes,
            loading: false
          })
        } else {
          throw new Error(res.message || '获取菜品失败')
        }
      })
      .catch(err => {
        console.error('Failed to load dishes:', err)
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

  // Group dishes by category
  groupDishesByCategory(dishes) {
    const categories = {}
    
    // Handle case where dishes might be undefined or not an array
    if (!Array.isArray(dishes)) {
      console.warn('Dishes data is not an array:', dishes)
      return []
    }
    
    dishes.forEach(dish => {
      // Validate dish data
      if (!dish || !dish.category) {
        console.warn('Invalid dish data:', dish)
        return
      }
      
      // Convert price to number
      const price = typeof dish.price === 'string' ? parseFloat(dish.price) : dish.price
      
      // Group by category
      if (!categories[dish.category]) {
        categories[dish.category] = {
          id: Object.keys(categories).length + 1,
          name: dish.category,
          dishes: []
        }
      }
      
      categories[dish.category].dishes.push({
        id: dish.id,
        name: dish.name,
        price: price,
        description: dish.description || '',
        is_available: dish.is_available !== undefined ? dish.is_available : true
      })
    })
    
    // Convert to array
    return Object.values(categories)
  },

  onLoad() {
    this.loadMenuData()
  },

  onPullDownRefresh() {
    this.loadMenuData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // Switch category
  switchCategory(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentCategory: index
    })
  },

  // Add to cart
  addToCart(e) {
    const dish = e.currentTarget.dataset.dish
    let cart = this.data.cart
    let totalPrice = this.data.totalPrice
    let totalItems = this.data.totalItems
    
    // Check if dish already in cart
    const existingItemIndex = cart.findIndex(item => item.id === dish.id)
    
    if (existingItemIndex > -1) {
      // Increase quantity
      cart[existingItemIndex].quantity += 1
    } else {
      // Add new item
      cart.push({
        ...dish,
        quantity: 1
      })
    }
    
    // Update total
    totalPrice += dish.price
    totalItems += 1
    
    this.setData({
      cart: cart,
      totalPrice: totalPrice,
      totalItems: totalItems
    })
  },

  // Remove from cart
  removeFromCart(e) {
    const index = e.currentTarget.dataset.index
    let cart = this.data.cart
    let totalPrice = this.data.totalPrice
    let totalItems = this.data.totalItems
    
    const item = cart[index]
    
    if (item.quantity > 1) {
      // Decrease quantity
      cart[index].quantity -= 1
    } else {
      // Remove item
      cart.splice(index, 1)
    }
    
    // Update total
    totalPrice -= item.price
    totalItems -= 1
    
    this.setData({
      cart: cart,
      totalPrice: totalPrice,
      totalItems: totalItems
    })
  },

  // Toggle cart visibility
  toggleCart() {
    this.setData({
      cartVisible: !this.data.cartVisible
    })
  },

  // Clear cart
  clearCart() {
    this.setData({
      cart: [],
      totalPrice: 0,
      totalItems: 0
    })
  },

  // Submit order
  submitOrder() {
    if (this.data.cart.length === 0) {
      wx.showToast({
        title: '请先点菜',
        icon: 'none'
      })
      return
    }
    
    // In a real app, you would send the order to your server here
    console.log('Order submitted:', this.data.cart)
    
    // Simulate API call to submit order
    wx.request({
      url: 'http://localhost:5001/api/orders',
      method: 'POST',
      data: {
        items: this.data.cart.map(item => ({
          dish_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total_amount: this.data.totalPrice
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        wx.showModal({
          title: '下单成功',
          content: `总计: ¥${this.data.totalPrice}`,
          showCancel: false,
          confirmText: '确定',
          success: () => {
            this.clearCart()
            this.setData({
              cartVisible: false
            })
          }
        })
      },
      fail: (err) => {
        console.error('Failed to submit order:', err)
        wx.showToast({
          title: '下单失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },

  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },

  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
})
