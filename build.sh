#!/bin/bash
# 简单的构建脚本 - 使用 npx esbuild（不需要全局安装）

cd "$(dirname "$0")"

echo "正在编译 TypeScript..."

# 使用 npx 运行 esbuild，不需要全局安装
# 将 react 等标记为 external，因为它们从 CDN 加载
npx --yes esbuild index.tsx --bundle --format=esm --outfile=dist/index.js --jsx=automatic --target=es2022 --external:react --external:react-dom --external:react/jsx-runtime --external:three --external:@react-three/fiber --external:@react-three/drei --external:@react-three/postprocessing --external:@mediapipe/tasks-vision 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 编译成功！文件在 dist/index.js"
    echo "现在可以运行: python3 -m http.server 8000"
    echo "然后访问: http://localhost:8000/index.html"
else
    echo "❌ 编译失败"
    exit 1
fi

