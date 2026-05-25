# 构建与发布

## 构建配置

### 环境要求

| 工具 | 版本 |
|------|------|
| JDK | 17 |
| Android SDK | compileSdk 36 |
| Kotlin | 2.3.0 |
| AGP | 8.13.2 |
| Node.js | ≥20（Web 模块） |
| pnpm | ≥9（Web 模块） |

### 依赖版本管理

所有依赖版本统一在 `gradle/libs.versions.toml` 中管理。

### 构建变体

| 变体 | 说明 |
|------|------|
| `appRelease` | 标准发布版（applicationIdSuffix: .release） |
| `appReleaseA` | 备用发布版（applicationIdSuffix: .releaseA） |
| `appDebug` | 调试版（applicationIdSuffix: .debug） |

### 版本号规则

```
versionName: 3.YY.MMDDHH    （基于构建时间的日期格式）
versionCode: 10000 + gitCommitCount
```

示例：`3.26.042020` + git commit 数量作为 versionCode。

### 签名配置

在 `gradle.properties` 或 `local.properties` 中配置：

```properties
RELEASE_STORE_FILE=/path/to/keystore.jks
RELEASE_STORE_PASSWORD=your_password
RELEASE_KEY_ALIAS=your_alias
RELEASE_KEY_PASSWORD=your_key_password
```

## 构建命令

```bash
# 构建 release APK
./gradlew assembleAppRelease

# 构建 debug APK
./gradlew assembleAppDebug

# 运行单元测试
./gradlew test

# 运行设备测试（需连接设备或模拟器）
./gradlew connectedAndroidTest

# 清理构建
./gradlew clean
```

### 构建优化

- JVM 堆：`-Xmx6g -Xms256m`
- 并行 GC：`-XX:+UseParallelGC`
- R8 代码压缩 + 资源压缩（release）
- ProGuard 规则：`app/proguard-rules.pro` + `app/cronet-proguard-rules.pro`
- 增量编译：Kotlin 增量编译已启用
- 文件系统监听：`org.gradle.vfs.watch=true`

## Web 模块构建

```bash
cd modules/web
pnpm install
pnpm build
```

构建产物自动复制到 `app/src/main/assets/web/`。

## CI/CD 流程

> 配置位置：`.github/workflows/`

### test.yml — 日常构建

**触发条件**：push 到 master、PR

**构建矩阵**：
- product: app / google
- buildType: release / releaseA

**流程**：
1. 生成版本号（时间戳）
2. JDK 17 环境
3. Gradle 构建（带缓存、并行）
4. APK 签名
5. 上传 artifacts（APK + mapping 文件）
6. 创建 GitHub Pre-release
7. （可选）蓝奏云上传
8. （可选）Telegram 通知

### release.yml — 正式发布

**触发条件**：手动 workflow_dispatch

**流程**：
1. 版本号准备
2. APK 签名
3. Gradle 构建
4. 创建 GitHub Release
5. （可选）Google Play 发布
6. 推送到 release 分支
7. CDN 缓存刷新

### web.yml — Web 界面构建

**触发条件**：`modules/web/` 目录变更

**流程**：
1. Node.js 22 + pnpm 9 环境
2. 依赖安装（带缓存）
3. Vue 应用构建
4. 自动提交构建产物到 Android assets

### cronet.yml — Cronet 库更新

**触发条件**：每周一 9:00（北京时间）

**流程**：
1. 检查最新 Chromium 版本
2. 下载新 Cronet 库
3. 更新 ProGuard 规则
4. 创建 PR

### 其他工作流

| 工作流 | 说明 |
|--------|------|
| `autoupdatefork.yml` | 每天 20:00 同步上游 fork |
| `stale.yml` | 每 5 天清理不活跃 Issue/PR（30 天标记 + 5 天后关闭） |

## 仓库配置注意

- `settings.gradle` 中的镜像仓库默认注释
- 如无法连接原仓库需自行启用镜像，**但不要提交修改**
- Room Schema 导出路径：`app/schemas/`
- lint 启用了 `checkDependencies`
- Cronet 版本配置在 `gradle.properties` 中：`CronetVersion=128.0.6613.40`
