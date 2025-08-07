// config/api.js
const config = {
  // 开发环境配置
  development: {
    baseURL: 'http://localhost:8088',
    api: {
      clothing: '/api/wardrobe/clothing',
      cosCredentials: '/api/cos/credentials'
    }
  },
  
  // 生产环境配置
  production: {
    baseURL: 'https://www.jmrecipe.com', // 请替换为实际的生产环境域名
    api: {
      clothing: '/api/wardrobe/clothing',
      cosCredentials: '/api/cos/credentials'
    }
  }
}

// 微信小程序中没有process.env，使用默认开发环境配置
// 可以通过修改defaultEnv来切换环境
const defaultEnv = 'development' // 或 'production'
const currentConfig = config[defaultEnv] || config.development

module.exports = {
  ...currentConfig,
  // 构建完整URL的辅助方法
  getFullURL: (endpoint) => {
    return currentConfig.baseURL + (currentConfig.api[endpoint] || endpoint)
  }
}