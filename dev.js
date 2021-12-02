const path = require('path')
const fs = require('fs')
const mode = 'mode = 0'

// 运行项目路径读取
const PRESET_PATH = path.resolve(__dirname)

const manifestPath = path.resolve(PRESET_PATH, './src/manifest.json')
const configPath = path.resolve(PRESET_PATH, './src/config.js')

// eslint-disable-next-line handle-callback-err
fs.readFile(configPath, 'utf8', function (err, files) {
  const result = files.replace(/(mode = 1)|(mode = 2)|(mode = 3)/g, mode)
  fs.writeFile(configPath, result, 'utf8', function (err) {
    // eslint-disable-next-line no-empty
    if (!err) {
      // 读取配置
      const GLOBALCONFIG = require('./src/config')
      const PROJECT_CONFIG = JSON.parse(fs.readFileSync(manifestPath).toString())
      PROJECT_CONFIG.name = GLOBALCONFIG.VUE_APP_TITLE
      PROJECT_CONFIG.appid = GLOBALCONFIG.appid
      PROJECT_CONFIG['mp-weixin'].appid = GLOBALCONFIG.APPID

      const writeFileStr = JSON.stringify(PROJECT_CONFIG, null, '\t')
      fs.writeFileSync(manifestPath, writeFileStr)
    }
  })
})
