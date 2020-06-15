let defaultData = [];
const mCity = {};
const mArea = {};

/**
 * 处理原始地址数据转换成专用数据
 * @param list  原始数据
 * @param init  是否初始化 如传空 已转换过不会再次转换
 * @returns {boolean}
 */
export function parseArea(list, init) {
  if (!init && defaultData.length) {
    return true;
  }
  defaultData = list;
  defaultData.forEach(province => {
    if (province.city) {
      province.city.forEach(city => {
        if (city.name) {
          if (!mCity[city.name]) {
            mCity[city.name] = [];
          }
          mCity[city.name].push({
            p: province.name,
            c: city.name,
            a: city.area || []
          });
        }
        if (city.area) {
          city.area.forEach(area => {
            if (area) {
              if (!mArea[area]) {
                mArea[area] = [];
              }
              mArea[area].push({
                p: province.name,
                c: city.name
              });
            }
          });
        }
      });
    }
  });
}

/**
 * 解析
 * @param address 任意地址字符串
 * @returns {{name: string, mobile: string, detail: string, zip_code: string, phone: string}}
 */
function addressParse(address) {
  const parse = {
    name: '',
    mobile: '',
    detail: '',
    zipCode: '',
    phone: ''
  };

  address = address
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ');

  const arr = address.split(' ');
  const newArr = [];
  arr.forEach(el => {
    newArr.push(el.replace(/(.*：)/g, ''));
  });
  address = newArr.join(' ');
  const search = [
    '地址',
    '收货地址',
    '收货人',
    '收件人',
    '收货',
    '电话',
    '联系方式',
    '联系人',
    '：',
    ':',
    '；',
    ';',
    '，',
    ',',
    '。'
  ];

  search.forEach(str => {
    address = address.replace(new RegExp(str, 'g'), ' ');
  });

  address = address.replace(/ {2,}/g, ' ');

  address = address.replace(/(\d{3})-(\d{4})-(\d{4})/g, '$1$2$3');

  address = address.replace(/(\d{3}) (\d{4}) (\d{4})/g, '$1$2$3');

  // 获取电话
  const mobileReg = /(86-[1][0-9]{10})|(86[1][0-9]{10})|([1][0-9]{10})/g;
  const mobile = mobileReg.exec(address);

  if (mobile) {
    parse.mobile = mobile[0];
    address = address.replace(mobile[0], ' ');
  }

  const phoneReg = /(([0-9]{3,4}-)[0-9]{7,8})|([0-9]{12})|([0-9]{11})|([0-9]{10})|([0-9]{9})|([0-9]{8})|([0-9]{7})/g;
  const phone = phoneReg.exec(address);
  if (phone) {
    parse.phone = phone[0];
    address = address.replace(phone[0], ' ');
  }

  // 邮编
  const zipReg = /([0-9]{6})/g;
  const zip = zipReg.exec(address);
  if (zip) {
    parse.zipCode = zip[0];
    address = address.replace(zip[0], '');
  }

  address = address.replace(/ {2,}/, ' ');
  const detail = detailParseForward(address.trim());
  if (!detail.province) {
    throw Error('请核对信息格式，地址无法匹配');
  }

  // 如果没有城市匹配上 比如用户输入 孙军，17856785546，重庆市开州区行将路1021号迎春小区35憧504室
  if (!detail.city) {
    // 获取省市区数组
    let objAddr = {};
    for (let i = 0; i < defaultData.length; i++) {
      if (defaultData[i].name === detail.province) {
        objAddr = defaultData[i];
        break;
      }
    }

    let detailArr = detail.addr;
    let areaArr = [];

    // 处理多个直辖市
    objAddr.city.forEach(el => {
      if (detailArr.indexOf(el.name) > -1 && detailArr.indexOf(el.name) < 6) {
        detailArr = detailArr.substr(detailArr.name.length);
        areaArr = el.area;
        detail.city = el.name;
      }
    });

    if (!detail.city) {
      detail.city = detail.province;
      objAddr.city.forEach(el => {
        if (el.name === detail.city) {
          areaArr = el.area;
          if (
            detailArr.indexOf(el.name) > -1 &&
            detailArr.indexOf(el.name) < 5
          ) {
            detailArr = detailArr.substr(el.name.length);
          }
        }
      });
    }

    for (let i = 0; i < areaArr.length; i++) {
      if (
        detailArr.indexOf(areaArr[i]) > -1 &&
        detailArr.indexOf(areaArr[i]) < 5
      ) {
        detail.area = areaArr[i];
        detailArr = detailArr.substr(areaArr[i].length);
        detail.addr = detailArr.trim();
      }
    }
  }

  if (detail.name) {
    parse.name = detail.name;
  } else {
    const list = detail.addr.split(' ').filter(str => str);
    if (list.length > 1) {
      parse.name = list[list.length - 1];
    }
    if (parse.name) {
      detail.addr = detail.addr.replace(parse.name, '').trim();
    }
  }

  parse.province = detail.province;
  parse.city = detail.city;
  parse.area = detail.area;
  parse.addr = detail.addr;
  parse.result = detail.result;
  return parse;
}

/**
 * 正向解析模式
 * 从前到后按 province city addr 逐级筛选
 * 有city的值即可说明解析成功
 * 此模式对地址顺序有要求
 * @param address
 * @returns {{province: string, city: string, area: string, addr: string}}
 */
function detailParseForward(address) {
  const parse = {
    province: '',
    city: '',
    area: '',
    addr: '',
    name: ''
  };
  const provinceKey = [
    '特别行政区',
    '古自治区',
    '维吾尔自治区',
    '壮族自治区',
    '回族自治区',
    '自治区',
    '省省直辖',
    '省',
    '市' // 直辖市
  ];

  const cityKey = [
    '布依族苗族自治州',
    '苗族侗族自治州',
    '自治州',
    '州',
    '市',
    '县',
    '盟',
    '新区',
    '直辖县',
    '地区',
    '岛',
    '九龙',
    '新界'
  ];

  for (const i in defaultData) {
    // 省名称
    const province = defaultData[i];
    let index = address.indexOf(province.name);
    // 判断省名称是否在前五位
    if (index > -1 && index < 6) {
      if (index > 0) {
        //省份不是在第一位，在省份之前的字段识别为名称
        parse.name = address.substr(0, index).trim();
      }
      parse.province = province.name;
      // 截取除省之外的字符串
      address = address.substr(index + province.name.length);
      for (const k in provinceKey) {
        if (address.indexOf(provinceKey[k]) === 0) {
          address = address.substr(provinceKey[k].length);
        }
      }
      for (const j in province.city) {
        const city = province.city[j];
        index = address.indexOf(city.name);
        if (index > -1 && index < 3) {
          parse.city = city.name;
          address = address.substr(index + parse.city.length);
          for (const k in cityKey) {
            if (address.indexOf(cityKey[k]) === 0) {
              address = address.substr(cityKey[k].length);
            }
          }
          if (city.area) {
            for (const k in city.area) {
              const area = city.area[k];
              index = address.indexOf(area);
              if (index > -1 && index < 3) {
                parse.area = area;
                address = address.substr(index + parse.area.length);
                break;
              }
            }
          }
          break;
        }
      }
      parse.addr = address.trim();
      break;
    }
  }
  return parse;
}

/**
 * 逆向解析 从后【县，区，旗】往前解析
 * 有地区就能大概返回地址了
 * @param address
 * @param ignoreArea 是否忽视区 因为地址中含有区容易导致匹配错误 例：山东省蓬莱市黄海花园东区西门宝威学堂 曲荣声收15753572456
 * @returns {{province: string, city: string, area: string, name: string, areaCopy: string, addr: string}}
 */
export function detailParse(address, {ignoreArea = false} = {}) {
  const parse = {
    province: '',
    city: '',
    area: '',
    name: '',
    areaCopy: '',
    addr: ''
  };
  let areaIndex = -1,
    cityIndex = -1;

  address = address.replace('  ', ' ');

  if (
    (!ignoreArea && address.indexOf('县') > -1) ||
    (!ignoreArea && address.indexOf('区') > -1) ||
    (!ignoreArea && address.indexOf('旗') > -1)
  ) {
    if (address.indexOf('旗') > -1) {
      areaIndex = address.indexOf('旗');
      parse.area = address.substr(areaIndex - 1, 2);
    }
    if (address.indexOf('区') > -1) {
      areaIndex = address.indexOf('区');
      if (address.lastIndexOf('市', areaIndex) > -1) {
        cityIndex = address.lastIndexOf('市', areaIndex);
        parse.area = address.substr(cityIndex + 1, areaIndex - cityIndex);
      } else {
        parse.area = address.substr(areaIndex - 2, 3);
      }
    }
    if (address.indexOf('县') > -1) {
      areaIndex = address.lastIndexOf('县');
      if (address.lastIndexOf('市', areaIndex) > -1) {
        cityIndex = address.lastIndexOf('市', areaIndex);
        parse.area = address.substr(cityIndex + 1, areaIndex - cityIndex);
      } else {
        parse.area = address.substr(areaIndex - 2, 3);
      }
    }
    parse.addr = address.substr(areaIndex + 1);
  } else {
    if (address.indexOf('市') > -1) {
      areaIndex = address.indexOf('市');
      parse.area = address.substr(areaIndex - 2, 3);
      parse.addr = address.substr(areaIndex + 1);
    } else {
      parse.addr = address;
    }
  }

  if (
    address.indexOf('市') > -1 ||
    address.indexOf('盟') > -1 ||
    address.indexOf('州') > -1
  ) {
    if (address.indexOf('市') > -1) {
      parse.areaCopy = address.substr(address.indexOf('市') - 2, 2);
    }
    if (address.indexOf('盟') > -1 && !mCity[parse.areaCopy]) {
      parse.areaCopy = address.substr(address.indexOf('盟') - 2, 2);
    }
    if (address.indexOf('州') > -1 && !mCity[parse.areaCopy]) {
      parse.areaCopy = address.substr(address.indexOf('州') - 2, 2);
    }
  }

  parse.area = parse.area.trim();
  if (parse.area && mArea[parse.area]) {
    if (mArea[parse.area].length === 1) {
      parse.province = mArea[parse.area][0].p;
      parse.city = mArea[parse.area][0].c;
    } else {
      parse.areaCopy = parse.areaCopy.trim();
      const addr = address.substr(0, areaIndex);
      const d = mArea[parse.area].find(item => {
        return addr.indexOf(item.p) > -1 || item.c === parse.areaCopy;
      });
      if (d) {
        parse.province = d.p;
        parse.city = d.c;
      } else {
        parse.result = mArea[parse.area];
      }
    }
  } else {
    if (parse.areaCopy) {
      const city = mCity[parse.areaCopy];
      if (city) {
        parse.province = city[0].p;
        parse.city = city[0].c;
        parse.addr = address.substr(
          address.indexOf(parse.city) + parse.city.length + 1
        );
        parse.area = '';
        for (const i in city[0].a) {
          if (parse.addr.indexOf(city[0].a[i]) === 0) {
            parse.area = city[0].a[i];
            parse.addr = parse.addr.replace(city[0].a[i], '');
            break;
          }
        }
      }
    } else {
      parse.area = '';
    }
  }
  parse.addr = parse.addr.trim();
  return parse;
}

export default addressParse;
