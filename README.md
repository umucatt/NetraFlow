# NetraFlow

NetraFlow（净流）是一款资产变化记录工具，用于本地记录账户余额、资产变动与历史轨迹。

这是一个基于 `Electron + React + TypeScript` 的本地桌面应用，使用 Vite 和 `npm` 管理开发、构建与运行流程。

## 环境要求

- Node.js 20+（建议使用 LTS 版本）
- npm

如果当前工作区没有全局 `npm`，可以使用项目内的 bundled runtime：

```powershell
$env:Path="$PWD\.tools\node-v22.22.2-win-x64;$env:Path"
& ".tools\node-v22.22.2-win-x64\npm.cmd" run build
```

## 初始化步骤

1. 进入项目目录：

   ```bash
   cd path\to\NetraFlow_dev
   ```

2. 安装依赖：

   ```bash
   npm install
   ```

3. 启动开发环境：

   ```bash
   npm run dev
   ```

4. 构建并运行桌面应用：

   ```bash
   npm start
   ```

## 常用命令

```bash
npm install
npm run dev
npm run build
npm start
```
