// config/api.js
const config = {
  // 开发环境配置
  dev: {
    baseURL: 'http://localhost:8088',
    api: {
      user: '/api/users',
      clothing: '/api/wardrobe/clothing',
      outfit: '/api/wardrobe/outfit',
      cosCredentials: '/api/cos/credentials',
      login: '/api/wechat/getopenid', // 微信登录接口
      family: '/api/family',
      categories: '/api/categories',
      weather: '/api/weather/now' // 天气接口
    }
  },
  
  // 生产环境配置
  prod: {
    baseURL: 'https://www.jmrecipe.top', // 请替换为实际的生产环境域名
    api: {
      user: '/api/users',
      userDetail: '/api/users/detail',
      clothing: '/api/wardrobe/clothing',
      outfit: '/api/wardrobe/outfit',
      cosCredentials: '/api/cos/credentials',
      login: '/api/wechat/getopenid', // 微信登录接口
      family: '/api/family',
      categories: '/api/categories',
      weather: '/api/weather/now' // 天气接口
    }
  }
}

// 微信小程序中没有process.env，使用默认开发环境配置
// 可以通过修改defaultEnv来切换环境
const defaultEnv = 'dev' // dev 或 prod
const currentConfig = config[defaultEnv] || config.dev

module.exports = {
  ...currentConfig,
  // 构建完整URL的辅助方法
  getFullURL: (endpoint) => {
    return currentConfig.baseURL + (currentConfig.api[endpoint] || endpoint)
  }
}