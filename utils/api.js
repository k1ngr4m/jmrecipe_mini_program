// API utility functions
const BASE_URL = 'http://localhost:5001/api'

// Generic request function
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// Get all dishes
function getDishes() {
  return request({
    url: '/dishes/list'
  })
}

// Get dish by ID
function getDishById(dishId) {
  return request({
    url: `/dishes/${dishId}`
  })
}

// Create a new dish
function createDish(dishData) {
  return request({
    url: '/dishes',
    method: 'POST',
    data: dishData
  })
}

// Update a dish
function updateDish(dishId, dishData) {
  return request({
    url: `/dishes/${dishId}`,
    method: 'PUT',
    data: dishData
  })
}

// Delete a dish
function deleteDish(dishId) {
  return request({
    url: `/dishes/${dishId}`,
    method: 'DELETE'
  })
}

// Get all orders
function getOrders() {
  return request({
    url: '/orders/list'
  })
}

// Get order by ID
function getOrderById(orderId) {
  return request({
    url: `/orders/${orderId}`
  })
}

// Create a new order
function createOrder(orderData) {
  return request({
    url: '/orders',
    method: 'POST',
    data: orderData
  })
}

// Update an order
function updateOrder(orderId, orderData) {
  return request({
    url: `/orders/${orderId}`,
    method: 'PUT',
    data: orderData
  })
}

// Delete an order
function deleteOrder(orderId) {
  return request({
    url: `/orders/${orderId}`,
    method: 'DELETE'
  })
}

module.exports = {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder
}