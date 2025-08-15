const config = require('../../config/api.js');

Page({
  data: {
    title: '首页',
    showLoginPrompt: false,
    // 天气数据
    weather: {
      temperature: '25',
      text: '晴天',
      icon: '☀️',
      code: '0'
    },
    clothesSuggestion: '建议穿搭：短袖+短裤',
    weatherLoading: true, // 天气数据加载状态
    weatherError: false // 天气数据错误状态
  },
  
  onLoad() {
    // 检查是否已登录
    // const hasLoggedIn = wx.getStorageSync('hasLoggedIn');
    // if (hasLoggedIn) {
    //   return;
    // }
    // else {
    this.getUserCode()
    // }
    
    // 获取天气数据
    this.getWeatherData();
  },

  // 获取天气数据
  getWeatherData() {
    // 设置加载状态
    this.setData({
      weatherLoading: true,
      weatherError: false
    });
    
    // 调用我们自己的后端天气接口
    const location = 'hangzhou'; // 默认城市
    const url = config.getFullURL('weather');
    
    wx.request({
      url: url,
      method: 'POST',
      data: {
        location: location,
        language: 'zh-Hans',
        unit: 'c'
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        console.log('天气数据获取成功:', res);
        if (res.statusCode === 200 && res.data) {
          const weatherData = res.data;
          
          // 更新天气数据
          this.setData({
            weather: {
              temperature: weatherData.temperature,
              text: weatherData.text,
              code: weatherData.code,
              // 根据天气代码设置图标
              icon: this.getWeatherIcon(weatherData.code)
            },
            // 使用后端返回的穿搭建议
            clothesSuggestion: weatherData.clothing_suggestion,
            weatherLoading: false,
            weatherError: false
          });
        } else {
          console.error('天气数据格式不正确:', res);
          // 使用默认数据并设置错误状态
          this.setData({
            weatherLoading: false,
            weatherError: true
          });
        }
      },
      fail: (err) => {
        console.error('获取天气数据失败:', err);
        // 使用默认数据并设置错误状态
        this.setData({
          weather: {
            temperature: '25',
            text: '晴天',
            icon: '☀️',
            code: '0'
          },
          clothesSuggestion: '建议穿搭：短袖+短裤',
          weatherLoading: false,
          weatherError: true
        });
      }
    });
  },
  
  // 根据天气代码获取天气图标
  getWeatherIcon(code) {
    const iconMap = {
      '0': '☀️', // 晴
      '1': '🌙', // 晴（夜间）
      '2': '☁️', // 多云
      '3': '☁️', // 少云
      '4': '☁️', // 多云
      '5': '雾霾', // 晴间霾
      '6': '🌫️', // 雾
      '7': '🌫️', // 雾（夜间）
      '8': '飑', // 飑
      '9': '飑', // 飑（夜间）
      '10': '沙', // 沙尘暴
      '11': '沙', // 沙尘暴（夜间）
      '12': '🌧️', // 雷阵雨
      '13': '🌧️', // 雷阵雨（夜间）
      '14': '🌧️', // 阵雨
      '15': '🌧️', // 阵雨（夜间）
      '16': '🌧️', // 中雨
      '17': '🌧️', // 中雨（夜间）
      '18': '🌧️', // 大雨
      '19': '🌧️', // 大雨（夜间）
      '20': '🌧️', // 暴雨
      '21': '🌧️', // 暴雨（夜间）
      '22': '🌨️', // 雪
      '23': '🌨️', // 雪（夜间）
      '24': '🌨️', // 小雪
      '25': '🌨️', // 小雪（夜间）
      '26': '🌨️', // 中雪
      '27': '🌨️', // 中雪（夜间）
      '28': '🌨️', // 大雪
      '29': '🌨️', // 大雪（夜间）
      '30': '🌨️', // 暴雪
      '31': '🌨️', // 暴雪（夜间）
      '32': '🌨️', // 雨夹雪
      '33': '🌨️', // 雨夹雪（夜间）
      '34': '❄️', // 冰雹
      '35': '❄️', // 冰雹（夜间）
      '36': '🌫️', // 雾霾
      '37': '🌫️', // 雾霾（夜间）
      '38': '🌫️', // 台风
      '39': '🌫️', // 台风（夜间）
      '40': '🌪️', // 龙卷风
      '41': '🌪️', // 龙卷风（夜间）
      '42': '❄️', // 凝雨
      '43': '❄️', // 凝雨（夜间）
      '44': '🌫️', // 浮尘
      '45': '🌫️', // 浮尘（夜间）
      '46': '🌫️', // 扬沙
      '47': '🌫️', // 扬沙（夜间）
      '48': '⚡', // 强雷暴
      '49': '⚡', // 强雷暴（夜间）
      '50': '飑', // 飑线
      '51': '飑', // 飑线（夜间）
      '52': '🌧️', // 毛毛雨
      '53': '🌧️', // 毛毛雨（夜间）
      '54': '❄️', // 冰针
      '55': '❄️', // 冰针（夜间）
      '56': '❄️', // 冰粒
      '57': '❄️', // 冰粒（夜间）
      '58': '🌨️', // 阵雪
      '59': '🌨️', // 阵雪（夜间）
      '60': '🌧️', // 小雨
      '61': '🌧️', // 小雨（夜间）
      '62': '🌧️', // 中雨
      '63': '🌧️', // 中雨（夜间）
      '64': '🌧️', // 大雨
      '65': '🌧️', // 大雨（夜间）
      '66': '🌧️', // 暴雨
      '67': '🌧️', // 暴雨（夜间）
      '68': '🌨️', // 大暴雪
      '69': '🌨️', // 大暴雪（夜间）
      '70': '❄️', // 特大暴雪
      '71': '❄️', // 特大暴雪（夜间）
      '72': '🌧️', // 强阵雨
      '73': '🌧️', // 强阵雨（夜间）
      '74': '🌧️', // 强雷阵雨
      '75': '🌧️', // 强雷阵雨（夜间）
      '76': '🌧️', // 极端降雨
      '77': '🌧️', // 极端降雨（夜间）
      '78': '🌨️', // 雪暴
      '79': '🌨️', // 雪暴（夜间）
      '80': '🌨️', // 米雪
      '81': '🌨️', // 米雪（夜间）
      '82': '🌨️', // 霰
      '83': '🌨️', // 霰（夜间）
      '84': '🌨️', // 冰粒
      '85': '🌨️', // 冰粒（夜间）
      '86': '🌫️', // 大雾
      '87': '🌫️', // 大雾（夜间）
      '88': '🌫️', // 特强浓雾
      '89': '🌫️', // 特强浓雾（夜间）
      '90': '🌧️', // 热带风暴
      '91': '🌧️', // 热带风暴（夜间）
      '92': '🌪️', // 暴雨洪涝
      '93': '🌪️', // 暴雨洪涝（夜间）
      '94': '⚡', // 雷电
      '95': '⚡', // 雷电（夜间）
      '96': '飑', // 大风
      '97': '飑', // 大风（夜间）
      '98': '🌪️', // 飑风
      '99': '🌪️' // 飑风（夜间）
    };
    return iconMap[code] || '❓'; // 默认问号图标
  },
  
  // 根据温度给出穿搭建议
  getClothesSuggestion(temperature) {
    const temp = parseInt(temperature);
    if (temp < 0) {
      return '建议穿搭：羽绒服+保暖内衣+手套';
    } else if (temp < 10) {
      return '建议穿搭：厚外套+毛衣+围巾';
    } else if (temp < 15) {
      return '建议穿搭：薄外套+长袖衬衫';
    } else if (temp < 20) {
      return '建议穿搭：薄外套+长袖T恤';
    } else if (temp < 25) {
      return '建议穿搭：短袖+薄外套';
    } else if (temp < 30) {
      return '建议穿搭：短袖+短裤';
    } else {
      return '建议穿搭：短袖+短裤+遮阳帽';
    }
  },

  getUserCode() {
    // 直接调用wx.login获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          const code = res.code;
          console.log('获取到code:', code);
          // 请求后端接口进行登录
          this.loginRequest(code);
        } else {
          console.error('登录失败！' + res.errMsg);
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
        }
      },
    })
  },

  // 请求后端登录接口
  loginRequest(code) {
    wx.request({
      url: config.getFullURL('login'), // 后端接口地址
      method: 'POST',
      data: {
        code: code
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      success: (resServer) => {
        console.log('请求成功', resServer);
        // 检查登录是否成功
        if (resServer.data && resServer.data.errcode === "0") {
          // 登录成功
          const userData = resServer.data;

          // 构造用户信息对象
          const userInfo = {
            nickName: userData.nickname,
            avatarUrl: userData.avatar_url,
            userid: userData.userid
          };

          // 保存用户信息到全局变量和本地存储
          const app = getApp();
          if (app.globalData) {
            app.globalData.userInfo = userInfo;
            app.globalData.userid = userData.userid;
            app.globalData.session_key = userData.session_key;
            app.globalData.unionid = userData.unionid;
            app.globalData.familyid = userData.familyid;
            app.globalData.memberid = userData.memberid;
            app.globalData.hasLoggedIn = true; // 设置登录状态
          }

          wx.setStorageSync('hasLoggedIn', true); // 保存登录状态到本地存储
          wx.setStorageSync('userInfo', userInfo); // 保存用户信息到本地存储
          wx.setStorageSync('userid', userData.userid); // 保存openid为userid到本地存储
          wx.setStorageSync('familyid', userData.familyid);
          wx.setStorageSync('memberid', userData.memberid);
          wx.setStorageSync('selectedMemberId', userData.memberid);
          console.log('登录成功，更新用户信息');

          // 更新页面数据
          this.setData({
            userInfo: userInfo
          });

          // 查询并创建family信息
          // this.queryAndCreateFamily(userData.openid);
        } else {
          // 登录失败
          wx.showToast({
            title: (resServer.data && resServer.data.errmsg) || '登录失败',
            icon: 'none'
          });
          console.error("登录失败:", resServer.data && resServer.data.errmsg);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络异常',
          icon: 'none'
        });
        console.error("请求失败:", err);
      }
    });
  },


  goToClothing() {
    wx.navigateTo({
      url: '/pages/clothing/clothing-list/clothing-list'
    })
  },

})