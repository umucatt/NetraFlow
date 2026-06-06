import {
  EXAMPLE_DATA_SETTINGS_BLOCK_ID,
  EXAMPLE_DATA_SETTINGS_ID,
  EXAMPLE_DATA_SETTINGS_SECTION
} from '../../app/exampleModeNavigation';
import type { SettingsSearchItem } from '../../search/searchTypes';
import type { GlobalSettingsSection } from './settingsPageTypes';

export const GLOBAL_SETTINGS_NAV_ITEMS: Array<{ id: GlobalSettingsSection; label: string }> = [

  { id: 'appearance', label: '显示与界面' },

  { id: 'charts', label: '图表设置' },

  { id: 'search', label: '全局搜索' },

  { id: 'backup', label: '数据与备份' },

  { id: 'security', label: '安全' },

  { id: 'about', label: '关于净流' }

];

export const GLOBAL_SETTINGS_SEARCH_ITEMS = [

  {

    id: 'appearance',

    title: '显示与界面',

    group: '全局设置',

    description: '外观、首页统计、主题和页面位置',

    sectionTitle: '全局设置',

    blockTitle: '显示与界面',

    summary: '控制界面显示方式、首页资产统计口径、主题和页面位置记忆。',

    previewItems: [

      '调整金额正负值的颜色显示',

      '设置首页资产统计的数值口径和展示格式',

      '控制页面主题与切换页面时的位置记忆方式'

    ],

    section: 'appearance',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '外观',

      '显示',

      '界面',

      '数字正负值显示',

      '红正绿负',

      '绿正红负',

      '首页资产统计',

      '资产统计数值类型',

      '净值',

      '总资产',

      '显示类型',

      '全称',

      '缩写',

      '紧凑数字格式',

      '页面主题',

      '浅色',

      '深色',

      '跟随系统',

      '主题风格',

      '页面位置记忆',

      '全局记忆',

      '覆盖后重置',

      '页面位置',

      '位置记忆',

      '页面滚动',

      '滚动位置',

      '页面被覆盖',

      '覆盖重置',

      '堆叠组',

      '展开状态',

      '收起状态'

    ],

    pinyinKeywords: ['xian shi', 'jie mian', 'wai guan', 'zhu ti', 'ye mian wei zhi ji yi'],

    pinyinInitials: ['xs', 'jm', 'wg', 'zt', 'ymwzjy']

  },

  {

    id: 'appearance-positive-negative-color',

    title: '数字正负值显示',

    group: '显示与界面',

    description: '金额颜色和正负值显示方式',

    sectionTitle: '显示与界面',

    blockTitle: '数字正负值显示',

    summary: '设置金额正负值在界面中的颜色表达方式。',

    previewItems: [

      '可在红正绿负与绿正红负之间切换',

      '影响账户余额、历史变动和搜索金额结果的视觉提示',

      '仅改变显示颜色，不改变金额正负逻辑'

    ],

    section: 'appearance',

    keywords: ['数字正负值显示', '红正绿负', '绿正红负', '金额颜色', '正负值颜色'],

    pinyinKeywords: ['shu zi zheng fu zhi xian shi'],

    pinyinInitials: ['szzfzxs']

  },

  {

    id: 'appearance-home-asset-stat',

    title: '资产统计数值类型',

    group: '显示与界面',

    description: '首页统计口径、标签和紧凑格式',

    sectionTitle: '显示与界面',

    blockTitle: '首页资产统计',

    summary: '设置首页资产统计卡片显示净值或总资产，以及标签和数字格式。',

    previewItems: [

      '可选择净值或总资产作为首页主统计',

      '可切换全称、缩写和紧凑数字格式',

      '影响首页资产总览的顶部统计展示'

    ],

    section: 'appearance',

    keywords: ['首页资产统计', '资产统计数值类型', '净值', '总资产', '显示类型', '全称', '缩写', '紧凑数字格式'],

    pinyinKeywords: ['zi chan tong ji shu zhi lei xing', 'jin zhi', 'zong zi chan'],

    pinyinInitials: ['zctjszlx', 'jz', 'zzc']

  },

  {

    id: 'appearance-theme',

    title: '页面主题',

    group: '显示与界面',

    description: '浅色、深色、跟随系统和主题风格',

    sectionTitle: '显示与界面',

    blockTitle: '页面主题',

    summary: '控制应用使用浅色、深色或跟随系统的显示主题。',

    previewItems: [

      '可选择浅色、深色或跟随系统',

      '已解锁时可切换额外主题风格',

      '影响整个应用的界面配色'

    ],

    section: 'appearance',

    keywords: ['页面主题', '浅色', '深色', '跟随系统', '主题风格', 'nyaa'],

    pinyinKeywords: ['ye mian zhu ti', 'qian se', 'shen se', 'gen sui xi tong'],

    pinyinInitials: ['ymzt', 'qs', 'ss', 'gsxt']

  },

  {

    id: 'appearance-page-position-memory',

    title: '页面位置记忆',

    group: '显示与界面',

    description: '页面切换时的滚动位置和堆叠状态',

    sectionTitle: '显示与界面',

    blockTitle: '页面位置记忆',

    summary: '控制切换页面时是否保留滚动位置和堆叠组展开状态。',

    previewItems: [

      '全局记忆：切换页面保留滚动位置和堆叠组状态',

      '覆盖后重置：页面被覆盖后重置滚动位置和堆叠组状态',

      '适合按个人浏览习惯控制返回页面时的位置'

    ],

    section: 'appearance',

    blockId: 'global-settings-page-position-memory',

    keywords: [

      '页面位置记忆',

      '全局记忆',

      '覆盖后重置',

      '页面位置',

      '位置记忆',

      '页面滚动',

      '滚动位置',

      '切换页面',

      '页面被覆盖',

      '覆盖重置',

      '堆叠组',

      '堆叠组状态',

      '展开状态',

      '收起状态'

    ],

    pinyinKeywords: [

      'ye mian wei zhi ji yi',

      'quan ju ji yi',

      'fu gai hou chong zhi',

      'ye mian wei zhi',

      'wei zhi ji yi',

      'ye mian gun dong',

      'gun dong wei zhi',

      'dui die zu'

    ],

    pinyinInitials: ['ymwzjy', 'qjjy', 'fghcz', 'ymwz', 'wzjy', 'ymgd', 'gdwz', 'ddz']

  },

  {

    id: 'charts',

    title: '图表设置',

    group: '全局设置',

    description: '图表配色、结构图和趋势图显示',

    sectionTitle: '全局设置',

    blockTitle: '图表设置',

    summary: '调整资产图表的配色规则、结构图展示和趋势图显示方式。',

    previewItems: [

      '控制首页缩略图表和资产总览图表的显示方式',

      '设置结构图、趋势图、横轴范围和点值显示',

      '可通过全局图表控制同步或锁定细分图表设置'

    ],

    section: 'charts',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '图表',

      '图表设置',

      '图表配色',

      '图表配色遵循',

      '创建时间优先',

      '占比优先',

      '首页缩略图表',

      '资产结构显示',

      '资产趋势显示',

      '全局图表控制',

      '控制模式',

      '平级设定',

      '全局锁定',

      '总资产图表设置',

      '多重叠加数字',

      '自适应纵轴',

      '横轴范围显示',

      '点值显示',

      '全局账户类型图表设置',

      '账户详情图表设置',

      '近 1 月',

      '近 3 月',

      '近 6 月',

      '近 1 年',

      '自适应',

      '最高最低',

      '不显示',

      '正资产',

      '负资产',

      '正负资产',

      '净资产'

    ],

    pinyinKeywords: [

      'tu biao',

      'tu biao she zhi',

      'tu biao pei se',

      'zi chan jie gou xian shi',

      'zi chan qu shi xian shi',

      'duo chong die jia shu zi',

      'zi shi ying zong zhou',

      'heng zhou fan wei xian shi',

      'dian zhi xian shi',

      'jin yi yue',

      'jin san yue',

      'jin liu yue',

      'jin yi nian'

    ],

    pinyinInitials: ['tb', 'tbsz', 'tbps', 'zcjgxs', 'zcqsxs', 'dcdjsz', 'zsyzz', 'hzfwxs', 'dzxs', 'jyy', 'jsy', 'jly', 'jyn']

  },

  {

    id: 'search',

    title: '全局搜索',

    group: '全局设置',

    description: '搜索范围、结果跳转与定位',

    sectionTitle: '全局设置',

    blockTitle: '全局搜索',

    summary: '管理全局搜索的结果范围、打开定位和辅助匹配方式。',

    previewItems: [

      '可搜索账户、历史记录、快照与设置项',

      '点击结果可打开对应页面并定位',

      '可配合“允许推断”扩展匹配方式'

    ],

    section: 'search',

    keywords: [

      '全局搜索',
      '搜索设置',
      '搜索范围',
      '结果跳转',
      '打开定位',
      '搜索定位',
      '设置项搜索',
      '搜索面板',
      '搜索入口'

    ],

    pinyinKeywords: ['quan ju sou suo', 'quan ji sou suo', 'sou suo'],

    pinyinInitials: ['qjss', 'ss']

  },

  {

    id: 'search-inference',

    title: '允许推断',

    group: '全局搜索',

    description: '拼音、首字母、错字和近似金额',

    sectionTitle: '全局搜索',

    blockTitle: '允许推断',

    summary: '控制全局搜索是否启用辅助推断匹配。',

    previewItems: [

      '开启：包含拼音、首字母、错字与近似金额等推断匹配',

      '关闭：仅显示字段中直接对应的命中结果',

      '适合在结果过多时收窄搜索范围'

    ],

    section: 'search',

    blockId: 'global-settings-search-logic',

    keywords: [

      '允许推断',
      '推断',
      '推断匹配',
      '关闭推断',
      '拼音',
      '首字母',
      '错字',
      '近似金额',
      '模糊匹配'

    ],

    pinyinKeywords: [

      'yun xu tui duan',
      'tui duan',
      'pin yin',
      'shou zi mu',
      'cuo zi',
      'jin si jin e',
      'mo hu pi pei'

    ],

    pinyinInitials: ['yxtd', 'td', 'py', 'szm', 'cz', 'jsje', 'mhpp']

  },

  {

    id: 'backup-user-settings',

    title: '用户配置文件',

    group: '数据与备份',

    description: '导出、导入和恢复用户配置',

    sectionTitle: '数据与备份',

    blockTitle: '用户配置文件',

    summary: '管理用户配置文件的导出、导入和恢复入口。',

    previewItems: [

      '可导出当前用户配置文件',

      '可从文件导入用户配置',

      '安全功能区的部分设置不会通过配置文件备份恢复'

    ],

    section: 'backup',

    keywords: ['用户配置文件', '导出用户配置文件', '导入用户配置文件', '配置备份', '配置恢复'],

    pinyinKeywords: ['yong hu pei zhi wen jian', 'dao chu yong hu pei zhi wen jian', 'dao ru yong hu pei zhi wen jian'],

    pinyinInitials: ['yhpzwj', 'dcyhpzwj', 'dryhpzwj']

  },

  {

    id: 'backup-history-snapshot',

    title: '历史记录备份',

    group: '数据与备份',

    description: '打开快照面板并管理手动/自动快照',

    sectionTitle: '数据与备份',

    blockTitle: '历史记录备份',

    summary: '从设置页进入快照面板，查看和管理手动导入导出与自动快照。',

    previewItems: [

      '可跳转到快照记录与快照导入导出面板',

      '快照面板包含手动快照和自动快照设置',

      '用于备份和恢复历史记录数据'

    ],

    section: 'backup',

    keywords: ['历史记录备份', '快照', '跳转至快照', '手动快照', '自动快照'],

    pinyinKeywords: ['li shi ji lu bei fen', 'kuai zhao'],

    pinyinInitials: ['lsjlbf', 'kz']

  },

  {

    id: EXAMPLE_DATA_SETTINGS_ID,

    title: '示例数据',

    group: '数据与备份',

    description: '进入、切换或退出示例模式',

    sectionTitle: '数据与备份',

    blockTitle: '示例数据',

    summary: '控制是否进入示例模式，并选择用于体验功能的示例数据模板。',

    previewItems: [

      '可进入示例模式查看预设资产数据',

      '可在示例模式下切换不同示例模板',

      '退出示例模式后回到真实数据'

    ],

    section: EXAMPLE_DATA_SETTINGS_SECTION,

    blockId: EXAMPLE_DATA_SETTINGS_BLOCK_ID,

    keywords: ['示例数据', '进入示例模式', '切换示例模板', '退出示例模式', '示例模板'],

    pinyinKeywords: ['shi li shu ju', 'shi li mo shi', 'shi li mo ban'],

    pinyinInitials: ['slsj', 'slms', 'slmb']

  },

  {

    id: 'backup-reset',

    title: '重置功能',

    group: '数据与备份',

    description: '清除配置、历史记录或全部数据',

    sectionTitle: '数据与备份',

    blockTitle: '重置功能',

    summary: '执行用户配置、历史记录或全部本地数据的重置操作。',

    previewItems: [

      '可单独清除用户配置',

      '可单独清除历史记录',

      '可清除全部本地数据'

    ],

    section: 'backup',

    keywords: ['重置功能', '清除用户配置', '清除历史记录', '清除所有', '重置', '清除'],

    pinyinKeywords: ['chong zhi gong neng', 'qing chu yong hu pei zhi', 'qing chu li shi ji lu', 'qing chu suo you'],

    pinyinInitials: ['czgn', 'qcyhpz', 'qclsjl', 'qcsy']

  },

  {

    id: 'backup',

    title: '数据与备份',

    group: '全局设置',

    description: '配置文件、快照入口、示例数据和重置',

    sectionTitle: '全局设置',

    blockTitle: '数据与备份',

    summary: '管理用户配置文件、历史记录备份入口、示例数据和本地数据重置。',

    previewItems: [

      '可导出或导入用户配置文件',

      '可进入快照面板管理历史记录备份',

      '可管理示例数据和重置操作'

    ],

    section: 'backup',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '数据',

      '备份',

      '用户配置文件',

      '导出用户配置文件',

      '导入用户配置文件',

      '历史记录备份',

      '快照',

      '跳转至快照',

      '示例数据',

      '进入示例模式',

      '切换示例模板',

      '退出示例模式',

      '重置功能',

      '清除用户配置',

      '清除历史记录',

      '清除所有',

      '导入',

      '导出'

    ],

    pinyinKeywords: ['shu ju', 'bei fen', 'kuai zhao', 'dao ru', 'dao chu'],

    pinyinInitials: ['sj', 'bf', 'kz', 'dr', 'dc']

  },

  {

    id: 'security-password-protection',

    title: '登录密码保护',

    group: '安全',

    description: '登录密码和自动锁定时间',

    sectionTitle: '安全',

    blockTitle: '登录密码保护',

    summary: '设置登录密码保护，并控制应用自动锁定时间。',

    previewItems: [

      '可开启或关闭登录密码保护',

      '可设置或修改登录密码',

      '可调整自动锁定时间'

    ],

    section: 'security',

    keywords: ['登录密码保护', '登陆密码保护', '是否开启登陆密码保护', '设置登录密码', '修改登录密码', '自动锁定时间'],

    pinyinKeywords: ['deng lu mi ma bao hu', 'she zhi deng lu mi ma', 'zi dong suo ding shi jian'],

    pinyinInitials: ['dlmmbh', 'szdlmm', 'zdsdsj']

  },

  {

    id: 'security-snapshot-encryption',

    title: '快照加密',

    group: '安全',

    description: '加密手动导出和自动生成的快照文件',

    sectionTitle: '安全',

    blockTitle: '快照加密',

    summary: '控制是否启用快照文件加密，并管理用于快照加密的密码。',

    previewItems: [

      '可启用或关闭快照加密',

      '可设置或修改快照密码',

      '仅加密快照文件，不加密本地当前数据'

    ],

    section: 'security',

    keywords: ['快照加密', '是否启用快照加密', '设置快照密码', '修改快照密码', '快照密码'],

    pinyinKeywords: ['kuai zhao jia mi', 'she zhi kuai zhao mi ma', 'xiu gai kuai zhao mi ma'],

    pinyinInitials: ['kzjm', 'szkzmm', 'xgkzmm']

  },

  {

    id: 'security',

    title: '安全',

    group: '全局设置',

    description: '登录保护、自动锁定和快照加密',

    sectionTitle: '全局设置',

    blockTitle: '安全',

    summary: '管理登录密码保护、自动锁定时间和快照文件加密。',

    previewItems: [

      '可设置登录密码保护和自动锁定',

      '可设置快照加密和快照密码',

      '安全设置会影响应用进入和快照文件恢复'

    ],

    section: 'security',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '安全',

      '登陆密码保护',

      '登录密码保护',

      '是否开启登陆密码保护',

      '设置登录密码',

      '修改登录密码',

      '自动锁定时间',

      '快照加密',

      '是否启用快照加密',

      '设置快照密码',

      '修改快照密码',

      '密码',

      '自动锁定',

      '加密'

    ],

    pinyinKeywords: ['an quan', 'mi ma', 'zi dong suo ding', 'jia mi'],

    pinyinInitials: ['aq', 'mm', 'zdsd', 'jm']

  },

  {

    id: 'about-software',

    title: '软件信息',

    group: '关于净流',

    description: '应用名称、英文名和当前版本',

    sectionTitle: '关于净流',

    blockTitle: '软件信息',

    summary: '查看净流 NetraFlow 的应用信息和当前版本。',

    previewItems: [

      '显示应用中文名和英文名',

      '显示当前安装版本',

      '用于确认正在使用的 NetraFlow 版本'

    ],

    section: 'about',

    keywords: ['软件信息', '净流', 'NetraFlow', '当前版本', '版本'],

    pinyinKeywords: ['ruan jian xin xi', 'jing liu', 'ban ben'],

    pinyinInitials: ['rjxx', 'jl', 'bb']

  },

  {

    id: 'about-license-font',

    title: '开源许可',

    group: '关于净流',

    description: '字体来源和开源许可信息',

    sectionTitle: '关于净流',

    blockTitle: '开源许可',

    summary: '查看应用使用字体与开源许可相关信息。',

    previewItems: [

      '包含字体许可说明',

      '包含 Noto Sans 相关信息',

      '用于确认应用资源的许可来源'

    ],

    section: 'about',

    keywords: ['开源许可', '字体', 'Noto Sans', '字体许可', '许可'],

    pinyinKeywords: ['kai yuan xu ke', 'zi ti', 'xu ke'],

    pinyinInitials: ['kyxk', 'zt', 'xk']

  },

  {

    id: 'about-contact-memo',

    title: '获取信息',

    group: '关于净流',

    description: '项目主页和版本发布入口',

    sectionTitle: '关于净流',

    blockTitle: '获取信息',

    summary: '查看 NetraFlow 的发布页和外部信息入口。',

    previewItems: [

      '可查看 GitHub Releases 发布页',

      '可查看 Bilibili 信息入口',

      '用于获取版本发布和项目相关信息'

    ],

    section: 'about',

    keywords: ['获取信息', 'Bilibili', 'GitHub', 'Releases', '发布页', '版本发布'],

    pinyinKeywords: ['huo qu xin xi', 'github', 'fa bu ye'],

    pinyinInitials: ['hqxx', 'github', 'fby']

  },

  {

    id: 'about',

    title: '关于净流',

    group: '全局设置',

    description: '软件信息、许可和版本发布入口',

    sectionTitle: '全局设置',

    blockTitle: '关于净流',

    summary: '查看软件信息、开源许可、字体说明和版本发布入口。',

    previewItems: [

      '显示 NetraFlow 的基本软件信息',

      '展示字体和许可相关内容',

      '提供版本发布与项目信息入口'

    ],

    section: 'about',

    keywords: [

      '设置页面入口',

      '功能区标题',

      '关于',

      '关于净流',

      '软件信息',

      '净流',

      'NetraFlow',

      '版本',

      '当前版本',

      '开源许可',

      '字体',

      'Noto Sans',

      '获取信息',

      'Bilibili',

      'GitHub',

      'Releases',

      '发布页',

      '许可'

    ],

    pinyinKeywords: ['guan yu', 'ruan jian xin xi', 'zi ti', 'xu ke', 'huo qu xin xi', 'ban ben'],

    pinyinInitials: ['gy', 'rjxx', 'zt', 'xk', 'hqxx', 'bb']

  }

] satisfies SettingsSearchItem[];

export const isGlobalSettingsSection = (value: string): value is GlobalSettingsSection =>

  GLOBAL_SETTINGS_NAV_ITEMS.some((item) => item.id === value);
