<p align="center">
  <img src="public/icons/netraflow.svg" alt="NetraFlow 图标" width="128" />
</p>

<h1 align="center">NetraFlow</h1>

<p align="center">
  本地资产变化记录工具
</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README_EN.md">English</a>
</p>

## 项目简介

NetraFlow（净流）是一款主要面向 Windows 的本地资产变化记录应用，用于记录账户余额、资产变动与历史轨迹。它适合希望把资产数据保存在本机、手动维护资产状态，并按时间查看变化的人。

应用基于 Electron、React、TypeScript 与 Vite 构建，使用 npm 管理依赖、开发、测试和打包流程。

## 主要功能

- 管理资产、负债账户类型，以及每个类型下的账户。
- 记录账户创建、修改余额、删除、归档和重新启用等变动历史。
- 查看首页资产统计、资产结构、资产趋势和账户详情图表。
- 通过单账户快速记录和「闪记」批量补录多日余额或净值变动。
- 导入外部整理后的汇总 JSON，并在本地完成账户匹配和风险确认。
- 使用全局搜索查找账户、历史记录、快照记录和设置项。
- 导出、导入手动快照，配置自动快照；启用登录密码后，新的加密快照使用创建时的登录密码加密。
- 配置主题、图表、搜索、数据备份和安全相关选项。

## 下载与安装

普通用户建议从 [GitHub Releases](https://github.com/umucatt/NetraFlow/releases) 下载已经发布的版本。

Windows 版本提供两类产物：

- Setup：`NetraFlow_<version>_Setup.exe`，适合使用安装向导安装。
- Portable：`NetraFlow_<version>_Portable.zip`，解压后运行其中的 `NetraFlow.exe`。

Setup 卸载流程默认勾选删除本地用户数据；取消勾选时会保留原安装目录下的 `userdata/`，重新安装到相同目录会继续读取保留的数据。Portable 版本的数据也位于解压目录下，直接删除整个解压目录会同时删除数据，请先自行备份。

当前 Windows 构建未启用代码签名。首次运行时，Windows 或安全软件可能显示来源提示，请确认下载来源为本仓库的 Releases 页面后再继续。

## 基本使用

1. 创建资产或负债账户类型，再在类型下添加账户。
2. 通过账户变更、单账户快速记录或闪记录入余额和变动。
3. 在首页、资产总览、账户详情和历史记录中查看变化。
4. 使用图表查看资产结构、资产趋势和账户趋势。
5. 在进行较大变更或导入前导出快照，需要时再从快照恢复。
6. 使用汇总导入时，先确认 JSON 格式、账户匹配结果和导入风险，再写入本地数据。

## 数据与隐私

NetraFlow 的当前数据保存在本地，不提供云同步，也不会自动上传资产数据。用户可以通过手动快照和自动快照备份数据。

0.9.9 的当前本地数据继续使用四个正式 JSON 文件：`core.json` 保存账户类型、账户和历史记录，并在启用登录密码保护后使用该登录密码加密；`settings.json` 保存自动快照、图表和普通全局偏好；`state.json` 保存快照记录、导入记录、首次欢迎和主题解锁等运行状态；`security.json` 只保存自动锁定、是否强制启用快照加密等可重建行为设置。`security.json` 不保存登录密码、密码 hash、快照密码、密钥或任何解密既有文件所必需的参数。

安装版和便携版默认都把用户数据放在程序目录下的 `userdata/` 中；运行缓存、日志和 Electron profile 数据放在程序目录下的 `runtime/` 中。开发环境的 runtime 和 userdata 与正式应用隔离，避免开发调试数据污染正式使用数据。

0.9.9 不自动迁移旧开发版本的 `storage.json` 数据，也不再使用 `previous` 副本恢复路径。启用登录密码后，登录密码就是本地 `core.json` 的解密密码；NF 不在磁盘保存登录密码或可复用解密凭证，解锁期间仅在主进程内存中保留会话密钥，锁定或退出后即丢弃。NetraFlow 不限制密码输入次数，忘记登录密码时无法恢复已加密的本地 core 数据。新的加密快照统一使用创建时的登录密码；修改或关闭登录密码不会自动修改历史快照，导入历史加密快照仍需要输入创建该快照时使用的密码。删除或损坏 `security.json` 不影响既有加密 core 或加密快照的解密参数，因为这些参数由文件自身携带。NetraFlow 0.9.9 使用 PBKDF2-HMAC-SHA-256 进行 600,000 次迭代。该参数基于 48,000 条历史记录的极端数据实测，并按最高 5 倍性能差距进行保守推演后确定。该结果不代表对所有 Windows 硬件进行完整兼容认证。完整性校验异常只作为风险提示，主动明文导出的文件不受登录密码保护。

示例模式使用程序同目录下临时 `.demo` 目录，退出示例或下次启动时会清理。示例模式中的操作不会写入真实 `userdata/`，也不会生成真实外部快照；快照导入导出和用户配置导入导出在示例模式中会被阻断。

## 当前限制

- 主要面向 Windows；macOS 和 Linux 不是当前发布目标。
- Windows 构建未启用代码签名，系统可能显示安全提示。
- 不提供自动更新，需要用户从 Releases 手动获取新版本。
- 资产数据主要由用户手动录入或从本地文件导入，不提供银行、券商或行情账户的自动同步。
- 本地当前数据不等同于云备份，请定期导出快照并妥善保存。
- 安装版卸载流程默认勾选删除本地用户数据；取消勾选时按安装器现有行为保留用户数据。

## 源码开发

### 环境要求

- Node.js 22 LTS
- npm
- Windows 环境用于验证 Windows 桌面应用和构建 Windows 产物

### 获取源码

```bash
git clone https://github.com/umucatt/NetraFlow.git
cd NetraFlow
```

### 安装依赖

```bash
npm ci
```

### 启动开发环境

```bash
npm run dev
```

该命令启动 Vite 渲染进程开发服务器，并在就绪后启动 Electron。开发运行时使用独立的应用标识、runtime 和 userdata。

### 类型检查

```bash
npm run typecheck
```

### 运行测试

```bash
npm test
```

### 生产构建

```bash
npm run build
```

该命令执行 TypeScript 检查、Vite 构建，并生成 Electron 主进程与预加载脚本的构建输出。

### 本地发布检查

```bash
npm run release:check
```

发布前的严格检查使用：

```bash
npm run release:check -- --strict
```

非 strict 模式会报告工作区 dirty 警告；strict 模式会把 dirty 工作区视为错误。

### Windows 构建产物

生成 Windows 产物前先运行：

```bash
npm run build
```

然后按需构建：

```bash
npm run dist:installer
npm run dist:portable
```

默认产物名称为：

- `release/installer/<version>/NetraFlow_<version>_Setup.exe`
- `release/portable/<version>/NetraFlow_<version>_Portable.zip`

如果同版本目录已存在，发布脚本会为输出目录追加序号。

### 版本号规则

- `package.json` 与 `package-lock.json` 中的版本号需要保持一致。
- 发布版本号使用 `major.minor.patch`，可带后缀。
- 发布 tag 使用 `v<version>`，并且需要指向当前发布提交。
- 当版本号小于 `1.0.0`，或后缀包含 `beta` / `rc` 时，Release 会标记为 Pre-release。

### 自动化验证

- 普通 push 到 `main`、指向 `main` 的 pull request，以及手动触发会运行 Verify Windows。
- Verify Windows 使用 Node.js 22，依次执行 `npm ci`、`npm run typecheck`、`npm test` 和 `npm run build`。
- 版本 tag `v*.*.*` 或 `v*.*.*-*` 会触发 Release Windows。
- Release Windows 会校验 tag 与版本、运行 `npm run release:check -- --strict`、类型检查、测试、构建、生成 Setup 和 Portable 产物，并验证发布文件。
- GitHub Release 默认创建为 Draft。
- `<1.0.0` 或版本后缀包含 `beta` / `rc` 时，Release 会创建为 Pre-release。

## 主要目录

| 路径 | 说明 |
| --- | --- |
| `electron/` | Electron 主进程、预加载脚本、本地存储和窗口相关逻辑 |
| `src/` | React 渲染进程、页面、功能模块、样式和测试 |
| `public/icons/` | 正式图标资源：`netraflow.svg` 为唯一源，Windows 使用 `netraflow.ico`、macOS 使用 `netraflow.icns`、Linux 使用 `linux/` PNG 图层 |
| `docs/assets/` | README 和文档展示资源 |
| `scripts/` | 开发启动、发布检查、打包、产物验证和发布说明脚本 |
| `build/` | 安装器脚本和随包许可证资源 |
| `.github/workflows/` | Windows 验证与发布工作流 |

## 扩展开发注意事项

- 修改本地数据结构时，需要维护四文件边界、schema 版本、future schema 拒绝策略和无 `previous` 恢复路径。
- 不要把开发 runtime、userdata、缓存、日志或用户数据打入发布产物。
- 生产图标唯一源文件为 `public/icons/netraflow.svg`；README 直接展示该 SVG，平台打包资源均由其生成。
- 修改图标资源后运行 `npm run generate:icons`，以重新生成 Windows ICO、macOS ICNS、Linux PNG 图层和视觉预览。
- 修改发布流程时，需要同步检查 `scripts/`、`.github/workflows/`、相关测试和 README 中的说明。
- 导入、快照和安全相关功能应继续优先做格式校验、完整性校验和可恢复性测试。

## 许可证

NetraFlow 使用 GPL-3.0-only 许可证。详情见 [LICENSE](LICENSE)。
