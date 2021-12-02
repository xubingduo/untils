# 工具函数

里面有各类处理函数


# 地址拆分匹配
import addressParse, {parseArea} from 'addressParse.js';
 ## 初始化数据用于智能拆分地址
    parseArea(areaList);
## 具体地址
    const result = addressParse('安徽省六安市金安区***小区，xbu，18888888888');
## uniapp打包 dev.js
  "predev:mp-weixin-test": "node ./test.js",