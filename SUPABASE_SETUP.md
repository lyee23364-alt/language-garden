# 语伴账号同步配置

网页已包含邮箱注册、登录、云端进度和按用户隔离数据的完整前端逻辑。上线前只需连接一个 Supabase 项目。

1. 在 Supabase 创建项目。
2. 打开项目的 SQL Editor，执行 `supabase-schema.sql`。
3. 在 Project Settings → API 中复制 Project URL 和 Publishable key。
4. 将它们填入 `supabase-config.js`：

```js
window.YG_SUPABASE = {
  url: "https://你的项目编号.supabase.co",
  publishableKey: "sb_publishable_..."
};
```

5. 在 Authentication → URL Configuration 中：
   - Site URL 填写最终的 GitHub Pages 地址；
   - Redirect URLs 同时加入 GitHub Pages 地址和本地预览地址（如需本地测试）。

Publishable key 本来就是供浏览器使用的公开标识，可以提交到 GitHub。绝对不要填写或提交 `service_role` key。

## 数据安全

`supabase-schema.sql` 会启用 Row Level Security。每个登录用户只能查询、新建和更新属于自己 `user_id` 的进度行，访客没有数据库权限。

## 每日内容规则

- 随机种子由本地日期、语言和账号 ID 组成；
- 同一账号在同一天刷新或换设备，任务顺序保持一致；
- 次日会从现有资料库重新抽取；
- “每日换题”只改变抽取结果，不会凭空扩充资料库。新增内容仍需更新网页中的资料库。

