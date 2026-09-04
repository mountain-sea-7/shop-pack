# deploy_shop 项目状态

## 项目目标

`deploy_shop` 是面向抖音带货生产流程的静态素材库。它将商品、账号样本、爆款音频、视频开头钩子、OCR 文案和内容包集中到一个可快速筛选、复制和跳转拍同款的网页中，降低选题与发布准备成本。

## 技术形态

- 纯静态站点，入口为 `index.html`。
- 构建脚本：`C:\Users\Administrator\.openclaw\workspace\scripts\build_shop.mjs`。
- 部署脚本：`C:\Users\Administrator\.openclaw\workspace\scripts\deploy_shop.ps1`。
- 托管平台：Surge。
- 线上域名：<https://xianyi-shop.surge.sh>。

## 目录结构

```text
deploy_shop/
├─ index.html                 # 页面入口及商品/素材主体结构
├─ assets/
│  ├─ site.css                # 页面样式
│  └─ site.js                 # 标签、复制、筛选、新号池、回复助手等交互
├─ data/
│  └─ audio-index.json        # 构建后的音频索引
├─ media/                     # 账号头像等本地图片素材
├─ audio_config.json          # 按抖音音乐 ID 索引的音频/OCR 配置
├─ sports_pack.json           # 常规体育钩子素材池
├─ fresh_sports_pack.json     # 新鲜体育素材包
├─ hot_sports_pack.json       # 热点体育素材包
├─ hooks_pack.json            # 按音乐 ID 索引的开头钩子与配套内容
├─ newacc_pool.json           # 新号可抽取素材池及验证标记
├─ nishi_kb.json              # 按产品主题组织的养生知识库
├─ ocr_config.json            # OCR 文案覆盖配置，当前为空对象
├─ hooks_delivery_0826.md     # 钩子素材交付说明
├─ bookmarklet.html           # 浏览器书签工具页面
├─ comment_guard.user.js      # 评论区辅助用户脚本
├─ CNAME                      # Surge 自定义域名声明
└─ .surgeignore               # Surge 部署忽略规则
```

## 数据文件用途

| 文件 | 当前结构 | 用途 |
|---|---|---|
| `audio_config.json` | 以音乐 ID 为键的对象 | 保存音频对应的账号、OCR 或展示配置，供构建和页面映射使用。 |
| `data/audio-index.json` | 构建产物 | 页面运行时使用的统一音频索引。 |
| `sports_pack.json` | 含 `schema_version`、`pool_type`、`items` | 常规体育视频钩子池。 |
| `fresh_sports_pack.json` | 含 `schema_version`、`updated`、`items` | 标记更新时间的新鲜体育素材。 |
| `hot_sports_pack.json` | 含 `updated`、`items` | 热点体育素材集合。 |
| `hooks_pack.json` | 以音乐 ID 为键的对象 | 保存爆款开头、节奏标签及配套内容包，支持页面复制。 |
| `newacc_pool.json` | 数组；含 `id`、`product`、`hook`、`beat_label`、`music_url`、`boss_verified` | 新账号素材抽取池，支持随机取用和本地已用状态。 |
| `nishi_kb.json` | 以产品主题为键的对象 | AI 回复助手使用的养生知识片段和产品关联资料。 |
| `ocr_config.json` | 对象 | 对指定视频 OCR 文案进行覆盖；当前无覆盖项。 |

## 页面功能概览

- 商品标签与素材计数。
- 账号素材折叠展示、音频组与视频卡。
- 钩子切换、OCR/文案复制、内容包复制。
- 抖音原声拍同款跳转。
- 音频指纹去重和重复项标记。
- 已发状态持久化与仅看未发筛选。
- 新号素材随机抽取与剩余数量统计。
- 回复助手的商品匹配、知识库检索、禁忌提醒和合规兜底；公网远程生成关闭。

## 构建与部署

在 Windows PowerShell 中执行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\Administrator\.openclaw\workspace\scripts\deploy_shop.ps1
```

脚本流程：

1. 运行 `build_shop.mjs` 生成或刷新 `index.html`、`assets/site.css`、`assets/site.js`、`data/audio-index.json`。
2. 检查入口和构建产物，并验证 `index.html` 的 `div` 开闭平衡。
3. 将部署前的 `index.html` 备份到项目目录外的 `deploy_shop_archive/YYYYMMDD/`。
4. 将 `deploy_shop` 发布到 `xianyi-shop.surge.sh`。
5. 请求线上首页，检查页面大小，并抽查指定商品的可见音频组数量。

## 维护约束

- 修改 `index.html` 后必须运行部署脚本并确认线上验证通过。
- 备份目录、临时备份和 `_surge_idx.html` 不进入 Git。
- 静态站点及仓库不得保存任何密钥、Cookie 或令牌；需要鉴权的能力应放到本地工具或服务端代理。
- 更新素材时优先修改数据源并重新构建，不直接绕过构建流程大范围手改生成内容。
