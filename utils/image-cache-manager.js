/**
 * 图片缓存管理器
 * 用于缓存COS签名图片URL，减少重复请求
 */

class ImageCacheManager {
  constructor() {
    // 初始化缓存对象
    this.cache = {};
    // 设置缓存过期时间（5分钟）
    this.cacheExpiry = 5 * 60 * 1000;
  }

  /**
   * 获取缓存的图片URL
   * @param {string} originalUrl - 原始图片URL
   * @returns {string|null} 缓存的签名URL，如果不存在或过期则返回null
   */
  getCachedImageUrl(originalUrl) {
    if (!originalUrl) return null;

    const cachedItem = this.cache[originalUrl];
    if (!cachedItem) return null;

    // 检查是否过期
    if (Date.now() - cachedItem.timestamp > this.cacheExpiry) {
      // 过期则删除缓存项
      delete this.cache[originalUrl];
      return null;
    }

    return cachedItem.signedUrl;
  }

  /**
   * 设置图片URL缓存
   * @param {string} originalUrl - 原始图片URL
   * @param {string} signedUrl - 签名后的URL
   */
  setCachedImageUrl(originalUrl, signedUrl) {
    if (!originalUrl || !signedUrl) return;

    this.cache[originalUrl] = {
      signedUrl: signedUrl,
      timestamp: Date.now()
    };
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cache = {};
  }

  /**
   * 清除指定URL的缓存
   * @param {string} originalUrl - 原始图片URL
   */
  removeCachedImageUrl(originalUrl) {
    if (originalUrl && this.cache[originalUrl]) {
      delete this.cache[originalUrl];
    }
  }
}

// 创建单例实例
const imageCacheManager = new ImageCacheManager();

module.exports = imageCacheManager;