// pages/member/member-list.js
const config = require('../../../../config/api.js');

Page({
  data: {
    members: [],
    selectedMemberId: null, // 选中的成员ID
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
  
  // 处理生日时间戳，转换为日期格式并计算年龄
  processBirthday(birthdayTimestamp, gender) {
    if (!birthdayTimestamp) {
      return {
        formattedBirthday: '',
        age: '',
        ageGroup: ''
      };
    }
    
    // 如果是时间戳（数字），则转换为日期对象
    let birthdayDate;
    if (typeof birthdayTimestamp === 'number') {
      // 假设时间戳是秒级的，如果不是需要乘以1000
      birthdayDate = new Date(birthdayTimestamp * 1000);
    } else if (typeof birthdayTimestamp === 'string') {
      // 如果是字符串格式的日期
      birthdayDate = new Date(birthdayTimestamp);
    } else {
      // 如果已经是日期对象
      birthdayDate = new Date(birthdayTimestamp);
    }
    
    // 检查日期是否有效
    if (isNaN(birthdayDate.getTime())) {
      return {
        formattedBirthday: birthdayTimestamp,
        age: '',
        ageGroup: ''
      };
    }
    
    // 格式化日期为 YYYY-MM-DD
    const year = birthdayDate.getFullYear();
    const month = String(birthdayDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthdayDate.getDate()).padStart(2, '0');
    const formattedBirthday = `${year}-${month}-${day}`;
    
    // 计算年龄
    const today = new Date();
    let age = today.getFullYear() - birthdayDate.getFullYear();
    const monthDiff = today.getMonth() - birthdayDate.getMonth();
    
    // 如果今年的生日还没到，则年龄减1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdayDate.getDate())) {
      age--;
    }
    
    // 根据年龄和性别获取传统称谓
    const ageGroup = this.getAgeGroup(age, gender);
    
    return {
      formattedBirthday: formattedBirthday,
      age: age,
      ageGroup: ageGroup
    };
  },

  // 根据年龄和性别获取传统称谓
  getAgeGroup(age, gender) {
    if (age === '' || age < 0) {
      return '';
    }
    
    // 性别标识：1-男，2-女
    const isMale = gender === 1;
    const isFemale = gender === 2;
    
    // 婴幼儿时期
    if (age >= 0 && age < 1) {
      return '襁褓';
    } else if (age >= 1 && age <= 3) {
      return '孩提';
    } else if (age >= 4 && age <= 6) {
      return '垂髫';
    }
    
    // 少年时期
    else if (isFemale && age >= 13 && age <= 14) {
      return '豆蔻';
    } else if (isFemale && age === 15) {
      return '及笄';
    } else if (isMale && age === 15) {
      return '束发';
    } else if (age >= 7 && age <= 14) {
      return '总角';
    }

    // 青年时期
    else if (isMale && age === 20) {
      return '弱冠';
    } else if (age >= 16 && age <= 29) {
      return '青年';
    } else if (age === 30) {
      return '而立';
    }
    
    // 中年时期
    else if (age === 40) {
      return '不惑';
    } else if (age === 50) {
      return '知命';
    } else if (age === 60) {
      return '花甲';
    } else if (age >= 31 && age <= 59) {
      return '中年';
    }
    
    // 老年时期
    else if (age === 70) {
      return '古稀之年';
    } else if (age >= 80 && age <= 90) {
      return '耄耋之年';
    } else if (age === 100) {
      return '期颐之年';
    } else if (age >= 61) {
      return '老年';
    }
    
    // 默认返回
    return '未知';
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
      url: config.getFullURL('family') + '/members/create',
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
      url: config.getFullURL('family') + '/members/list',
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
          // 处理成员数据，转换生日时间戳并计算年龄
          const processedMembers = res.data.map(member => {
            return {
              ...member,
              ...this.processBirthday(member.birthday, member.gender)
            };
          });
          
          this.setData({
            members: processedMembers,
            hasLoadedMembers: true
          });
          
          // 将成员列表存储到本地，供其他页面使用
          wx.setStorageSync('members', processedMembers);
          
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

  // 跳转到新增成员页面
  goToAddMember() {
    wx.navigateTo({
      url: '/pages/settings/member/member-add/member-add'
    });
  },

  // 跳转到编辑成员页面
  goToEditMember(e) {
    const member = e.currentTarget.dataset.member;
    wx.navigateTo({
      url: '/pages/settings/member/member-edit/member-edit?member=' + encodeURIComponent(JSON.stringify(member))
    });
  },

  // 删除成员
  deleteMember(e) {
    const member = e.currentTarget.dataset.member;
    const userid = wx.getStorageSync('userid') || '';
    const familyid = wx.getStorageSync('familyid') || '';
    
    if (!userid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除成员"${member.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: config.getFullURL('family') + '/members/delete',
            method: 'POST',
            data: {
              userid: userid,
              familyid: familyid,
              memberid: member.memberid
            },
            header: {
              'Content-Type': 'application/json'
            },
            success: (res) => {
              if (res.statusCode === 200) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 刷新列表
                this.getMemberList();
              } else {
                wx.showToast({
                  title: '删除失败',
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
        }
      }
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

  // 表单提交事件处理（仿照 clothing-add 页面）
  addMember(e) {
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
  
  // 提交成员表单（仿照 clothing-add 页面）
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
    const requestData = {
      userid: userid,
      familyid: familyid,
      name: formData.name,
      gender: formData.gender,
      birthday: formData.birthday,
    };
    
    console.log('发送的数据:', JSON.stringify(requestData, null, 2));

    wx.request({
      url: config.getFullURL('family') + '/members/create',
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

  // 保存成员（保持原有函数以确保向后兼容）
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
      url: config.getFullURL('family') + '/members/create',
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
