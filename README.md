<p align="center">
  <img src="src/assets/brand/netraflow-logo.svg" alt="NetraFlow" width="128" />
</p>

<h1 align="center">NetraFlow</h1>

<p align="center">本地资产变化记录桌面工具</p>

<p align="center">
  <strong>简体中文</strong> · <a href="README_EN.md">English</a>
</p>

## 项目介绍

NetraFlow（净流）是一款本地资产变化记录桌面工具，用于手动维护资产与负债账户、记录余额和净值变化，并通过历史记录和图表了解资产在不同时间的变化

本项目使用 Codex 进行辅助开发，且为本人的第一个项目（个人需求导向）

## 主要功能

- 管理资产、负债分类及其账户
- 记录余额、净值和历史变化
- 查看资产结构、趋势和账户明细
- 使用快速记录和闪记补充多日数据
- 导入整理后的汇总数据
- 搜索账户、历史记录、快照和设置
- 创建手动快照和自动快照
- 使用登录密码保护本地数据
- 使用加密快照保存重要备份
- 配置主题、图表、备份和安全选项
- 通过示例模式体验功能，不影响正式数据

## 下载与安装

普通用户可从 [GitHub Releases](https://github.com/umucatt/NetraFlow/releases) 下载发行版本

NetraFlow 提供 64 位桌面版本；macOS 仅提供 Apple Silicon 版本

| 平台 | 架构 | 形式 | 文件名 |
| --- | --- | --- | --- |
| Windows | x64 | 安装版 | `NetraFlow_<version>_x64_Setup.exe` |
| Windows | x64 | 便携版 | `NetraFlow_<version>_x64_Portable.zip` |
| macOS | Apple Silicon arm64 | DMG | `NetraFlow_<version>_arm64.dmg` |
| Linux | x64 | AppImage | `NetraFlow_<version>_x64.AppImage` |
| Linux | x64 | DEB | `NetraFlow_<version>_x64.deb` |

### Windows

安装版通过安装向导完成安装

便携版解压后运行 `NetraFlow.exe`，无需安装

### macOS

打开 DMG，将 NetraFlow 拖入“应用程序”目录后运行

### Linux

AppImage：

```bash
chmod +x NetraFlow_<version>_x64.AppImage
./NetraFlow_<version>_x64.AppImage
```

DEB：

```bash
sudo apt install ./NetraFlow_<version>_x64.deb
```

安装 DEB 时需要系统包管理权限，NetraFlow 日常运行不需要管理员或 root 权限

## 数据与隐私

NetraFlow 是一款本地工具，账户、历史记录、设置和快照等内容保存在设备上的 NetraFlow 数据目录中

用户数据位于 `userdata/`，应用运行产生的缓存、日志等内容位于 `runtime/`；不同平台使用各自的本地目录，具体位置由应用管理

建议根据使用频率不定期创建手动快照，或开启自动快照；自动快照基于应用启动事件并根据设置检查是否需要执行，NetraFlow 没有自启动或注册系统定时任务/唤醒的功能

需要将数据导出到 NetraFlow 之外查看、迁移，或在卸载前进行通用备份时，请关闭登录密码保护/快照加密功能后导出明文快照；加密快照主要用于 NetraFlow 内部恢复，第三方程序无法直接识别其中的数据

需要注意：

- 本地磁盘损坏、误删除、卸载或清除数据都可能造成数据丢失
- 忘记登录密码后，受密码保护的数据可能无法恢复
- 历史加密快照可能需要创建该快照时使用的密码
- 主动导出的明文文件不受登录密码保护，需要自行妥善保管
- 进行较大修改、批量导入、迁移设备或卸载应用前，建议先创建并复制一份快照到其他位置

### 文件完整性提示

NetraFlow 会检查本应用目录下的本地数据和导入文件的完整性

当检测到数据可能发生了并非由 NetraFlow 正常操作产生的变化，或内容存在不一致时，应用会给出风险提示，并避免在状态不明确时直接覆盖现有数据；遇到提示时，建议先保留当前文件和已有快照，再确认数据来源及内容

### 清除本地数据

应用内的“清除全部”功能用于清除 NetraFlow 管理的 `userdata/` 和 `runtime/`，完成后应用会退出

不同发行形式还需注意：

- Windows 安装版卸载时默认勾选清除本地用户数据；取消勾选可保留数据
- Windows 便携版的 `userdata/` 和 `runtime/` 位于解压目录中，也可以在退出应用后手动删除对应目录或整个便携目录
- macOS 和 Linux 卸载应用本体前，需要清除本地数据时，应先在应用内执行“清除全部”
- 删除应用本体与删除本地数据是两个不同操作，卸载前请先确认是否需要保留快照

## 卸载

卸载应用前，请先阅读“数据与隐私”中的清除和备份说明

### Windows

安装版可通过 Windows“设置 → 应用”卸载，也可以使用开始菜单中的卸载入口

便携版退出应用后，直接删除解压目录即可

### macOS

退出 NetraFlow 后，从“应用程序”目录将 `NetraFlow.app` 移到废纸篓

### Linux

AppImage 版本退出后，删除 AppImage 文件即可

DEB 版本：

```bash
sudo apt remove netraflow
```

---

## 源码开发与自行构建

NetraFlow 使用 Electron、React、TypeScript 和 Vite 构建，Windows、macOS 和 Linux 共享同一套业务代码

### 环境要求

- Node.js 22
- npm
- 与目标发行包对应的操作系统

真实发行包应在对应平台上完成构建和验证

### 获取源码

```bash
git clone https://github.com/umucatt/NetraFlow.git
cd NetraFlow
npm ci
```

### 开发与检查

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

发布前还可以运行：

```bash
npm run release:check
npm run release:check -- --strict
```

严格检查会同时验证发布上下文和 Git 状态

### 本地构建

构建发行包前先运行：

```bash
npm run build
```

Windows：

```bash
npm run dist:installer
npm run dist:portable
```

macOS：

```bash
npm run dist:mac
```

Linux：

```bash
npm run dist:linux
npm run dist:deb
```

Windows、macOS 和 Linux 的发行包应分别在对应平台上构建和验证

## 主要目录

| 路径 | 说明 |
| --- | --- |
| `electron/` | Electron 主进程与桌面平台集成 |
| `src/` | 应用界面与共享业务逻辑 |
| `src/assets/brand/` | 品牌源文件 |
| `public/` | 静态资源与平台图标 |
| `scripts/` | 开发、检查、构建和打包工具 |
| `build/` | 打包配置与发行资源 |
| `.github/workflows/` | 自动化检查与发行流程 |

## 开发注意事项

- 保持一套共享业务代码，平台差异集中处理
- 不因支持新平台而破坏已有平台行为
- 修改数据格式或数据目录时，应同时考虑兼容与迁移
- 不把用户数据、测试数据、缓存或日志打入发行包
- 不在应用运行时依赖提权或隐藏脚本
- 新增依赖前应确认必要性，并保持 lockfile 一致
- 修改完成后至少运行类型检查、测试和生产构建
- 涉及平台行为或发行包时，应在目标平台上实际验证
- 参与开发前请阅读 [AGENTS.md](AGENTS.md)

## 开发/测试平台

以下环境用于项目的主要开发和测试，不代表最低配置，也不表示所有同类设备均已完成兼容性验证

| 平台 | 主要环境 |
| --- | --- |
| Windows | Windows 11 IoT Enterprise LTSC 2024（24H2），Intel Core i5-13600KF，32 GB 内存 |
| macOS | MacBook Pro，Apple M1 Pro，16 GB 内存 |
| Linux | Ubuntu 26.04 LTS x64，与 Windows 共用同一台双系统主机 |


## 许可证

NetraFlow 使用 [GNU General Public License v3.0 only](LICENSE)
