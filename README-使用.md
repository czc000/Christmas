# 使用方法（简单版）

## 步骤1：编译 TypeScript

```bash
cd /home/mrz/christmas-tree/Pinky-ChristmasMemories
bash build.sh
```

这会自动下载 esbuild 并编译所有文件。

## 步骤2：启动服务器

```bash
python3 -m http.server 8000
```

## 步骤3：打开浏览器

访问：`http://localhost:8000/index.html`

---

**如果 build.sh 失败，说明需要先安装 Node.js：**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 然后再次运行
bash build.sh
```

