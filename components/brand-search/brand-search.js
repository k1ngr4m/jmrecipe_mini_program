Component({
  properties: {
    // 品牌列表
    brandList: {
      type: Array,
      value: []
    },
    // 默认选中的品牌
    defaultBrand: {
      type: Object,
      value: null,
      observer: function(newVal) {
        // 当defaultBrand属性更新时，更新组件内部状态
        if (newVal) {
          this.setData({
            selectedBrand: newVal,
            selectedBrandId: newVal.id,
            searchText: newVal.name
          });
        }
      }
    },
    // 占位符文本
    placeholder: {
      type: String,
      value: '请输入品牌名称'
    }
  },

  data: {
    searchText: '',           // 搜索文本
    showDropdown: false,      // 是否显示下拉列表
    filteredBrands: [],       // 过滤后的品牌列表
    selectedBrand: null,      // 选中的品牌
    selectedBrandId: null     // 选中品牌的ID
  },

  lifetimes: {
    attached: function() {
      // 组件实例进入页面节点树时执行
      if (this.data.defaultBrand) {
        this.setData({
          selectedBrand: this.data.defaultBrand,
          selectedBrandId: this.data.defaultBrand.id,
          searchText: this.data.defaultBrand.name
        });
      }
    }
  },

  observers: {
    'brandList': function(newVal) {
      // 当品牌列表更新时，重新过滤
      if (this.data.searchText) {
        this.filterBrands(this.data.searchText);
      }
    }
  },

  methods: {
    // 搜索输入事件
    onSearchInput: function(e) {
      const value = e.detail.value;
      this.setData({
        searchText: value
      });
      
      if (value) {
        this.filterBrands(value);
        this.setData({
          showDropdown: true
        });
      } else {
        this.setData({
          filteredBrands: [],
          showDropdown: false
        });
      }
      
      // 触发搜索事件
      this.triggerEvent('search', { value: value });
    },

    // 搜索框获得焦点
    onSearchFocus: function() {
      if (this.data.searchText && this.data.filteredBrands.length > 0) {
        this.setData({
          showDropdown: true
        });
      }
    },

    // 搜索框失去焦点
    onSearchBlur: function() {
      // 延迟隐藏下拉列表，确保点击选项时不会立即隐藏
      setTimeout(() => {
        this.setData({
          showDropdown: false
        });
      }, 200);
    },

    // 清空搜索
    clearSearch: function() {
      this.setData({
        searchText: '',
        filteredBrands: [],
        showDropdown: false,
        selectedBrand: null,
        selectedBrandId: null
      });
      
      // 触发清空事件
      this.triggerEvent('clear');
    },

    // 过滤品牌列表
    filterBrands: function(keyword) {
      const brandList = this.data.brandList || [];
      const filtered = brandList.filter(brand => {
        return brand.name && brand.name.toLowerCase().includes(keyword.toLowerCase());
      });
      
      this.setData({
        filteredBrands: filtered
      });
    },

    // 选择品牌
    selectBrand: function(e) {
      const brand = e.currentTarget.dataset.brand;
      this.setData({
        selectedBrand: brand,
        selectedBrandId: brand.id,
        searchText: brand.name,
        showDropdown: false
      });
      
      // 触发选择事件
      this.triggerEvent('select', { brand: brand });
    }
  }
});