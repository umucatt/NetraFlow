# NetraFlow

NetraFlow（净流）是一款本地资产变化记录工具，用于记录账户余额、资产变动和历史轨迹。

它是一个基于 Electron、React 和 TypeScript 的 Windows 桌面应用，使用 Vite 和 npm 管理开发、测试、构建与打包流程。

## 基本说明

- NetraFlow 只在本机记录数据
- NetraFlow 不联网同步数据
- NetraFlow 不连接银行、证券、支付平台或其它金融账户
- NetraFlow 不内置 AI，也不会自动分析或上传你的资产数据
- 当前版本建议运行在 Windows 10 64 位及以上系统

## 数据位置

NetraFlow 有安装版和便携版两种打包方式。

- 安装版使用 Electron 默认的本地用户数据目录
- 安装版卸载时会清理 NetraFlow 的本地数据
- 便携版会把数据保存在 NetraFlow.exe 同级的 userData 目录
- 便携版适合放在固定目录中使用，移动整个便携版目录时可以一并带走本地数据

## 开发环境

- Node.js 20+，建议使用 LTS 版本
- npm
- Windows 10 64 位及以上系统

## 获取源码

    git clone https://github.com/umucatt/NetraFlow.git
    cd NetraFlow
    npm install

## 本地开发

    npm run dev

## 测试与构建

    npm test
    npm run build

## 打包

生成 Windows 安装版：

    npm run dist:installer

生成 Windows 便携版：

    npm run dist:portable

安装版和便携版的发布文件建议放在 GitHub Releases 中，不建议直接提交到源码仓库。

## 项目结构

- src/：前端界面与主要业务逻辑
- electron/：Electron 主进程与预加载脚本
- scripts/：测试、安装版和便携版打包脚本
- build/：安装器脚本和授权文件
- public/：应用图标等静态资源
- src/__tests__/：测试文件

## 授权说明

build/licenses/ 中保留了内置 Noto 字体相关授权文件。

请在分发安装版或便携版时保留相关授权文件。

## 许可证

NetraFlow 使用 GNU General Public License v3.0 许可。

你可以使用、学习、修改和分发本项目。但如果你分发基于本项目修改或整合形成的衍生作品，也需要按照 GPLv3 开源，并提供相应源码。

内置 Noto 字体使用对应的开源字体许可，相关授权文件保留在 build/licenses/ 中。