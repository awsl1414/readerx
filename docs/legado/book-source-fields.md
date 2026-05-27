# 书源配置字段详解

> 源码位置：`app/src/main/java/io/legado/app/data/entities/BookSource.kt` 及 `rule/` 目录

## BookSource 实体

书源是 Legado 的核心配置，定义了如何从网站搜索、获取、解析书籍内容。

### 基础信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookSourceUrl` | String (PK) | 书源唯一标识 URL |
| `bookSourceName` | String | 书源名称 |
| `bookSourceGroup` | String? | 书源分组（逗号分隔） |
| `bookSourceType` | Int | 类型：0=文本, 1=音频, 2=图片, 3=文件 |
| `bookUrlPattern` | String? | 详情页 URL 匹配正则 |
| `bookSourceComment` | String? | 书源注释说明 |
| `variableComment` | String? | 变量说明 |

### 开关与排序

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | Boolean | 是否启用 |
| `enabledExplore` | Boolean | 是否启用发现页 |
| `customOrder` | Int | 手动排序序号 |
| `weight` | Int | 智能排序权重 |
| `lastUpdateTime` | Long | 最后更新时间 |
| `respondTime` | Long | 响应时间（毫秒），用于排序 |

### 网络配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `header` | String? | 自定义 HTTP 请求头（JSON 格式） |
| `loginUrl` | String? | 登录 URL |
| `loginUi` | String? | 登录界面定义（JSON，用于 App 内显示登录表单） |
| `loginCheckJs` | String? | 登录验证 JS（返回 true/false） |
| `enabledCookieJar` | Boolean? | 启用自动 Cookie 管理 |
| `concurrentRate` | String? | 并发请求频率限制 |
| `jsLib` | String? | JavaScript 库 |

### URL 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `searchUrl` | String? | 搜索 URL 规则 |
| `exploreUrl` | String? | 发现页 URL 规则（支持多个，用换行或特殊格式分隔） |
| `exploreScreen` | String? | 发现页筛选规则 |

### 规则组

| 字段 | 类型 | 说明 |
|------|------|------|
| `ruleSearch` | SearchRule? | 搜索结果解析规则 |
| `ruleExplore` | ExploreRule? | 发现页解析规则 |
| `ruleBookInfo` | BookInfoRule? | 书籍详情解析规则 |
| `ruleToc` | TocRule? | 目录解析规则 |
| `ruleContent` | ContentRule? | 正文解析规则 |
| `ruleReview` | ReviewRule? | 评论解析规则 |

### 其他

| 字段 | 类型 | 说明 |
|------|------|------|
| `coverDecodeJs` | String? | 封面解密 JS |

---

## SearchRule — 搜索结果规则

| 字段 | 说明 |
|------|------|
| `checkKeyWord` | 关键词校验规则 |
| `bookList` | ★ 书籍列表提取规则 |
| `name` | ★ 书名提取规则 |
| `author` | ★ 作者提取规则 |
| `intro` | 简介提取规则 |
| `kind` | 分类提取规则 |
| `lastChapter` | 最新章节提取规则 |
| `updateTime` | 更新时间提取规则 |
| `bookUrl` | ★ 书籍详情 URL 提取规则 |
| `coverUrl` | 封面 URL 提取规则 |
| `wordCount` | 字数提取规则 |

**处理流程**：
1. `bookList` 从搜索结果页面提取书籍元素列表
2. 对每个元素，用 `name`/`author`/`bookUrl` 等提取对应字段
3. `bookUrl` 提取到的 URL 用于后续获取书籍详情

---

## ExploreRule — 发现页规则

与 SearchRule 字段基本相同（继承自 BookListRule），无 `checkKeyWord`。

---

## BookInfoRule — 书籍详情规则

| 字段 | 说明 |
|------|------|
| `init` | 初始化规则（在详情页加载后首先执行） |
| `name` | 书名 |
| `author` | 作者 |
| `intro` | ★ 简介 |
| `kind` | 分类标签（逗号分隔） |
| `lastChapter` | 最新章节 |
| `updateTime` | 更新时间 |
| `coverUrl` | 封面 URL |
| `tocUrl` | ★ 目录页 URL（与详情页不同时使用） |
| `wordCount` | 字数 |
| `canReName` | 是否允许重命名 |
| `downloadUrls` | 下载 URL |

**`tocUrl` 的用途**：部分网站的详情页和目录页不在同一页面，`tocUrl` 指定目录页地址。

---

## TocRule — 目录规则

| 字段 | 说明 |
|------|------|
| `preUpdateJs` | 更新前执行的 JS（用于预处理） |
| `chapterList` | ★ 章节列表提取规则 |
| `chapterName` | ★ 章节名提取规则 |
| `chapterUrl` | ★ 章节 URL 提取规则 |
| `formatJs` | 章节名格式化 JS |
| `isVolume` | 是否为卷标记的规则 |
| `isVip` | 是否为 VIP 章节的规则 |
| `isPay` | 是否已付费的规则 |
| `updateTime` | 章节更新时间 |
| `nextTocUrl` | ★ 下一页目录 URL（分页目录） |

**分页目录**：当目录跨多页时，`nextTocUrl` 指定下一页的 URL，引擎会自动循环获取直到无下一页。

---

## ContentRule — 正文规则

| 字段 | 说明 |
|------|------|
| `content` | ★ 正文内容提取规则 |
| `title` | 从正文页提取标题 |
| `nextContentUrl` | ★ 下一页正文 URL（分页正文） |
| `webJs` | WebView 中执行的 JS |
| `sourceRegex` | 源正则匹配 |
| `replaceRegex` | 内容替换规则 |
| `imageStyle` | 图片显示样式 |
| `imageDecode` | 图片解密 JS |
| `payAction` | 购买操作 |

**分页正文**：部分章节内容跨多页，`nextContentUrl` 指定下一页 URL。

**图片处理**：
- `imageStyle` 控制图片在阅读器中的显示方式
- `imageDecode` 用于加密图片的解密（如 base64 编码的图片）

---

## ReviewRule — 评论规则

| 字段 | 说明 |
|------|------|
| `reviewUrl` | 评论页 URL |
| `avatarRule` | 用户头像提取 |
| `contentRule` | 评论内容提取 |
| `postTimeRule` | 发布时间提取 |
| `reviewQuoteUrl` | 引用/回复 URL |
| `voteUpUrl` | 点赞 URL |
| `voteDownUrl` | 踩 URL |
| `postReviewUrl` | 发表评论 URL |
| `postQuoteUrl` | 发表回复 URL |
| `deleteUrl` | 删除评论 URL |

---

## searchUrl 格式

搜索 URL 支持以下占位符和选项：

```
https://example.com/search?q={{key}}&page=<page>
```

| 占位符 | 说明 |
|--------|------|
| `{{key}}` | 搜索关键词 |
| `<page>` | 当前页码 |
| `{{js代码}}` | JS 表达式求值 |

### 带 POST 请求的搜索 URL

```
https://example.com/search,{"method":"POST","body":"keyword={{key}}&page=<page>"}
```

### 带 WebView 的搜索 URL

```
https://example.com/search,{"webView":true,"webJs":"document.querySelector('.result').innerHTML"}
```

---

## exploreUrl 格式

发现页支持多分类，每行一个：

```
分类名称::url1
分类名称2::url2
```

或 JSON 格式：

```
[{"title":"分类名","url":"url规则","style":{}}]
```

其中 `style` 字段支持 FlexChildStyle 属性控制 UI 布局。
