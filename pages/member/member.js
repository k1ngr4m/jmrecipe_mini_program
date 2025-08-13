// pages/member/member.js
const config = require('../../config/api.js');

Page({
  data: {
    members: [],
    selectedMemberId: null, // 选中的成员ID
    showModal: false,
    name: '',
    gender: '',
    genderIndex: 0,
    genderOptions: ['男', '女'],
    birthday: '',
    hasAttemptedToCreateDefaultMember: false, // 是否已尝试创建默认成员
    hasLoadedMembers: false // 是否已加载过成员列表
  },

  onLoad() {
    // 页面加载时检查是否有已保存的选中成员
    const savedSelectedMemberId = wx.getStorageSync('selectedMemberId');
    if (savedSelectedMemberId) {
      this.setData({
        selectedMemberId: savedSelectedMemberId
      });
    }
    
    // 重置尝试创建默认成员的标志位
    this.setData({
      hasAttemptedToCreateDefaultMember: false
    });
    
    // 获取成员列表
    this.getMemberList();
  },
  
  onShow() {
    // 只有在已经加载过成员列表的情况下才刷新列表
    if (this.data.hasLoadedMembers) {
      this.getMemberList(false)
    }
  },
  
  // 检查并创建默认成员
  checkAndCreateDefaultMember() {
    const members = this.data.members;
    if (!members || members.length === 0) {
      // 如果成员列表为空，尝试创建默认成员
      this.createDefaultMember();
    }
  },
  
  // 创建默认成员
  createDefaultMember() {
    const userid = wx.getStorageSync('userid') || '';
    if (!userid) {
      console.log('未获取到userid，无法创建默认成员');
      return;
    }
    
    // 获取用户信息（如果有的话）
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 准备默认成员数据
    const requestData = {
      userid: userid,
      familyid: wx.getStorageSync('familyid') || '',
      name: userInfo.nickName || '默认成员',
      gender: '男', // 默认性别为男
      birthday: '1990-01-01', // 默认生日
    };
    
    console.log('创建默认成员请求数据:', requestData);

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
            title: '默认成员创建成功',
            icon: 'success'
          });
          
          // 重新获取成员列表并设置选中状态，但不创建默认成员
          this.getMemberList(false);
        } else {
          console.error('创建默认成员失败:', res);
          wx.showToast({
            title: '创建默认成员失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('创建默认成员请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 获取成员列表
  getMemberList(shouldCreateDefault = true) {
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    if (!userid) {
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
        userid: userid,
        familyid: familyid
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            members: res.data,
            hasLoadedMembers: true
          });
          
          // 如果成员列表为空，创建默认成员
          if (shouldCreateDefault && (!res.data || res.data.length === 0) && !this.data.hasAttemptedToCreateDefaultMember) {
            this.setData({
              hasAttemptedToCreateDefaultMember: true
            });
            this.createDefaultMember();
          } else {
            // 如果还没有选中的成员，且列表不为空，设置第一个成员为默认选中
            if (!this.data.selectedMemberId && res.data.length > 0 && res.data[0].memberid) {
              this.selectMember({currentTarget: {dataset: {id: res.data[0].memberid}}});
            }
          }
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

  // 选中成员
  selectMember(e) {
    const memberId = e.currentTarget.dataset.id;
    
    // 确保memberId有效再设置
    if (memberId) {
      this.setData({
        selectedMemberId: memberId
      });
      
      // 保存选中的成员ID到本地存储
      wx.setStorageSync('selectedMemberId', memberId);
      
      console.log('选中的成员ID:', memberId);
    } else {
      console.error('无效的成员ID:', memberId);
    }
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
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    if (!userid) {
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
      userid: userid,
      familyid: familyid,
      name: this.data.name,
      gender: this.data.gender,
      birthday: this.data.birthday,
    };
    
    // 验证日期格式
    if (this.data.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(this.data.birthday)) {
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