// pages/settings/member/member-edit/member-edit.js
const config = require('../../../../config/api.js');
const { request } = require('../../../../utils/request.js');

Page({
  data: {
    memberid: '',
    name: '',
    gender: '',
    genderIndex: 0,
    genderOptions: ['男', '女'],
    birthday: ''
  },

  onLoad(options) {
    // 页面加载时获取传递的成员信息
    if (options.member) {
      const member = JSON.parse(decodeURIComponent(options.member));
      // 处理生日时间戳，转换为日期格式
      let formattedBirthday = '';
      if (member.birthday) {
        if (typeof member.birthday === 'number') {
          // 假设时间戳是秒级的，需要乘以1000
          const birthdayDate = new Date(member.birthday * 1000);
          // 检查日期是否有效
          if (!isNaN(birthdayDate.getTime())) {
            // 格式化日期为 YYYY-MM-DD
            const year = birthdayDate.getFullYear();
            const month = String(birthdayDate.getMonth() + 1).padStart(2, '0');
            const day = String(birthdayDate.getDate()).padStart(2, '0');
            formattedBirthday = `${year}-${month}-${day}`;
          }
        } else if (typeof member.birthday === 'string') {
          // 如果已经是字符串格式的日期
          formattedBirthday = member.birthday;
        }
      }
      
      this.setData({
        memberid: member.memberid,
        name: member.name,
        gender: member.gender,
        genderIndex: member.gender === 1 ? 0 : 1,
        birthday: formattedBirthday
      });
    }
  },

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

  // 表单提交事件处理
  updateMember(e) {
    console.log('表单提交事件触发');
    
    const formData = e.detail.value;
    console.log('表单数据:', formData);
    
    // 添加其他字段到formData（在验证之前）
    formData.name = this.data.name || '';
    formData.gender = this.data.gender || '';
    formData.birthday = this.data.birthday || '';
    
    // 验证必填字段
    if (!formData.name || !formData.gender || !formData.birthday) {
      wx.showToast({
        title: '请填写所有必填字段',
        icon: 'none'
      });
      return;
    }
    
    // 验证日期格式
    if (formData.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthday)) {
      wx.showToast({
        title: '日期格式不正确',
        icon: 'none'
      });
      return;
    }
    
    // 直接提交表单
    this.submitMemberForm(formData);
  },
  
  // 提交成员表单
  submitMemberForm(formData) {
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    if (!userid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 准备发送的数据，确保格式正确
    // 将日期字符串转换为秒级时间戳
    let birthdayTimestamp = formData.birthday;
    if (formData.birthday && typeof formData.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(formData.birthday)) {
      const date = new Date(formData.birthday);
      // 转换为秒级时间戳
      birthdayTimestamp = Math.floor(date.getTime() / 1000);
    }
    
    const requestData = {
      userid: userid,
      familyid: familyid,
      memberid: this.data.memberid,
      name: formData.name,
      gender: formData.gender,
      birthday: birthdayTimestamp,
    };
    
    console.log('发送的数据:', JSON.stringify(requestData, null, 2));

    request({
      url: config.getFullURL('family') + '/members/update',
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          // 返回上一页并刷新成员列表
          const pages = getCurrentPages();
          if (pages.length >= 2) {
            const prevPage = pages[pages.length - 2]; // 上一个页面
            if (prevPage && typeof prevPage.getMemberList === 'function') {
              prevPage.getMemberList();
            }
            wx.navigateBack();
          } else {
            wx.redirectTo({
              url: '/pages/settings/member/member-list/member-list'
            });
          }
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