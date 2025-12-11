# 🚀 快速开始 - GitHub Pages 部署

## 5 分钟快速部署

### 步骤 1: 创建 GitHub 仓库并推送代码

```bash
# 进入项目目录
cd /home/mrz/christmas-tree/Pinky-ChristmasMemories

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "准备部署到 GitHub Pages"

# 重命名分支为 main（如果需要）
git branch -M main

# 添加远程仓库（替换为你的实际仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 推送代码
git push -u origin main
```

### 步骤 2: 启用 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击 **Settings**（设置）
3. 左侧菜单找到 **Pages**（页面）
4. 在 **Source** 下选择：**GitHub Actions**
5. 保存

### 步骤 3: 等待自动部署

- 首次部署需要 2-5 分钟
- 在仓库的 **Actions** 标签页查看部署进度
- 部署成功后，访问：`https://你的用户名.github.io/仓库名/`

### 步骤 4: 配置自定义域名（可选）

1. 编辑 `CNAME` 文件，输入你的域名（例如：`christmas.yourdomain.com`）
2. 提交更改：
   ```bash
   git add CNAME
   git commit -m "添加自定义域名"
   git push
   ```
3. 在你的域名 DNS 设置中添加 CNAME 记录：
   - **类型**: CNAME
   - **主机记录**: `christmas`（或你想要的子域名）
   - **记录值**: `你的用户名.github.io`
4. 等待 DNS 生效（几分钟到几小时）
5. GitHub 会自动配置 SSL 证书

## ✅ 完成！

现在你的对象可以在任何地方通过浏览器访问你的圣诞树项目了！

## 📝 后续更新

每次更新代码后，只需：

```bash
git add .
git commit -m "更新内容"
git push
```

GitHub Actions 会自动重新部署。

## ❓ 遇到问题？

查看 `部署说明.md` 获取详细的故障排除指南。


