// orders.js
Page({
  data: {
    orders: [
      {
        id: '20230801001',
        status: 'completed',
        statusText: '已完成',
        date: '2023-08-01 12:30',
        amount: '88.50',
        items: [
          { name: '宫保鸡丁', quantity: 1 },
          { name: '麻婆豆腐', quantity: 1 },
          { name: '米饭', quantity: 2 }
        ]
      },
      {
        id: '20230728002',
        status: 'pending',
        statusText: '待付款',
        date: '2023-07-28 19:15',
        amount: '126.00',
        items: [
          { name: '红烧肉', quantity: 1 },
          { name: '清蒸鱼', quantity: 1 },
          { name: '时令蔬菜', quantity: 1 }
        ]
      },
      {
        id: '20230725003',
        status: 'completed',
        statusText: '已完成',
        date: '2023-07-25 18:45',
        amount: '65.80',
        items: [
          { name: '鱼香肉丝', quantity: 1 },
          { name: '酸辣汤', quantity: 1 }
        ]
      }
    ]
  },

  onLoad() {
    // In a real app, you would fetch orders from the server
    console.log('Loading order history...')
  }
})