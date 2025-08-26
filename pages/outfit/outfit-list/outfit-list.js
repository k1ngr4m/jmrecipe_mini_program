const config = require('../../../config/api.js');
const { request } = require('../../../utils/request.js');

Page({
  data: {
    title: '穿搭列表',
    outfitType: 0, // 穿搭类型
    outfitTypeName: '', // 穿搭类型名称
    outfitList: [], // 穿搭列表
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    page: 1, // 当前页码
    pageSize: 20 // 每页数量
  },

  onLoad(options) {
    console.log('穿搭列表页面加载，参数:', options);
    
    // 获取穿搭类型参数
    const outfitType = options.type || '';
    const outfitTypeName = options.name || '';
    
    if (!outfitType) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({
      outfitType: outfitType,
      outfitTypeName: outfitTypeName,
      title: outfitTypeName || '穿搭列表'
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: this.data.title
    });
    
    // 获取穿搭列表
    this.getOutfitList();
  },

  // 获取穿搭列表
  getOutfitList() {
    if (this.data.isLoading || !this.data.hasMore) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    const memberid = wx.getStorageSync('selectedMemberId') || '';
    
    request({
      url: config.getFullURL('outfit') + '/list',
      method: 'POST',
      data: {
        userid: userid,
        familyid: familyid,
        memberid: memberid,
        type: this.data.outfitType,
        page: this.data.page,
        page_size: this.data.pageSize
      },
      success: (res) => {
        console.log('获取穿搭列表成功:', res);
        
        if (res.statusCode === 200 && res.data && res.data.code === 1) {
          const newList = res.data.result || [];
          const outfitList = this.data.page === 1 ? newList : [...this.data.outfitList, ...newList];
          const hasMore = newList.length === this.data.pageSize;
          
          this.setData({
            outfitList: outfitList,
            page: this.data.page + 1,
            hasMore: hasMore,
            isLoading: false
          });
        } else {
          console.error('获取穿搭列表失败:', res);
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取穿搭列表网络错误:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        this.setData({
          isLoading: false
        });
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    }, () => {
      this.getOutfitList();
    });
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.getOutfitList();
    }
  },

  // 跳转到穿搭详情页
  goToOutfitDetail(e) {
    const outfitId = e.currentTarget.dataset.id;
    console.log('跳转到穿搭详情页，outfitId:', outfitId);
    
    if (!outfitId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/outfit/outfit-detail/outfit-detail?id=${outfitId}`
    });
  },

  // 添加穿搭
  addOutfit() {
    console.log('添加穿搭');
    wx.navigateTo({
      url: '/pages/outfit/outfit-add/outfit-add'
    });
  }
});