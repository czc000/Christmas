# CNAME 文件配置说明

## ⚠️ 重要提示

当前的 `CNAME` 文件包含示例域名 `example.com`，**必须替换为你的实际域名**，否则 GitHub Pages 部署会失败。

## 配置步骤

### 1. 编辑 CNAME 文件

打开 `CNAME` 文件，将内容替换为你的实际域名：

```
christmas.yourdomain.com
```

**注意**：
- 文件中只能有一行
- 不要包含 `http://` 或 `https://`
- 可以使用主域名（如 `yourdomain.com`）或子域名（如 `christmas.yourdomain.com`）

### 2. 配置 DNS 记录

在你的域名 DNS 提供商处添加 CNAME 记录：

- **类型**: CNAME
- **主机记录**: `christmas`（如果使用子域名）或 `@`（如果使用主域名）
- **记录值**: `你的GitHub用户名.github.io`

**示例**：
- 如果使用子域名 `christmas.yourdomain.com`：
  - 主机记录：`christmas`
  - 记录值：`username.github.io`
  
- 如果使用主域名 `yourdomain.com`：
  - 主机记录：`@`
  - 记录值：`username.github.io`

### 3. 提交更改

```bash
git add CNAME
git commit -m "配置自定义域名"
git push
```

### 4. 等待生效

- DNS 记录生效通常需要几分钟到几小时
- GitHub 会自动检测并配置 SSL 证书
- 在仓库的 Settings > Pages 中可以查看域名状态

## 不使用自定义域名

如果不想使用自定义域名，可以：

1. **删除 CNAME 文件**：
   ```bash
   git rm CNAME
   git commit -m "移除自定义域名配置"
   git push
   ```

2. 使用 GitHub 提供的默认域名：`https://你的用户名.github.io/仓库名/`


