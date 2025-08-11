// pages/member/member.js
const config = require('../../config/api.js');

Page({
  data: {
    members: [],
    showModal: false,
    name: '',
    gender: '',
    genderIndex: 0,
    genderOptions: ['男', '女'],
    birthday: ''
  },

  onLoad() {
    // 页面加载时获取成员列表
    this.getMemberList();
  },

  // 获取成员列表
  getMemberList() {
    const openid = wx.getStorageSync('openid') || '';
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: config.getFullURL('familyMembers') + '/list',
      method: 'POST',
      data: {
        openid: openid
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            members: res.data
          });
        } else {
          wx.showToast({
            title: '获取成员列表失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 显示新增成员弹窗
  showAddModal() {
    this.setData({
      showModal: true,
      editingMember: null,
      name: '',
      gender: '',
      genderIndex: 0,
      birthday: '',
      relationship: ''
    });
  },

  // 隐藏弹窗
  hideAddModal() {
    this.setData({
      showModal: false
    });
  },

  // 编辑成员
  /*editMember(e) {
    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find(item => item.id === memberId);
    
    if (member) {
      this.setData({
        showModal: true,
        editingMember: member,
        name: member.name,
        gender: member.gender,
        genderIndex: this.data.genderOptions.indexOf(member.gender),
        birthday: member.birthday
      });
    }
  },*/

  // 输入事件处理
  onNameInput(e) {
    this.setData({
      name: e.detail.value
    });
  },

  onGenderChange(e) {
    const genderIndex = e.detail.value;
    const gender = this.data.genderOptions[genderIndex];
    this.setData({
      genderIndex: genderIndex,
      gender: gender
    });
  },

  bindDateChange(e) {
    this.setData({
      birthday: e.detail.value
    });
  },


  // 保存成员
  saveMember() {
    const openid = wx.getStorageSync('openid') || '';
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 验证必填字段
    if (!this.data.name || !this.data.gender || !this.data.birthday) {
      wx.showToast({
        title: '请填写所有必填字段',
        icon: 'none'
      });
      return;
    }

    // 准备发送的数据，确保格式正确
    const requestData = {
      openid: openid,
      name: this.data.name,
      gender: this.data.gender,
      birthday: this.data.birthday,
      relationship: '家庭成员' // 默认关系值
    };
    
    // 验证日期格式
    if (requestData.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(requestData.birthday)) {
      wx.showToast({
        title: '日期格式不正确',
        icon: 'none'
      });
      return;
    }
    
    console.log('发送的数据:', JSON.stringify(requestData, null, 2));

    wx.request({
      url: config.getFullURL('familyMembers') + '/create',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
          
          // 关闭弹窗
          this.hideAddModal();
          
          // 刷新列表
          this.getMemberList();
        } else {
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
})