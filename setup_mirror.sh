#!/bin/bash

set -e

PROXY="http://35.212.182.155:3128"

echo ">>> 配置系统全局代理..."
cat >> /etc/environment << EOF
http_proxy=${PROXY}
https_proxy=${PROXY}
no_proxy=localhost,127.0.0.1
EOF

echo ">>> 配置 Docker 代理..."
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/proxy.conf << EOF
[Service]
Environment="HTTP_PROXY=${PROXY}"
Environment="HTTPS_PROXY=${PROXY}"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF
systemctl daemon-reload
systemctl restart docker

echo ">>> 配置 Git 代理..."
if command -v git &> /dev/null; then
    git config --global http.proxy ${PROXY}
    git config --global https.proxy ${PROXY}
    echo "✅ Git 代理配置完成"
else
    echo "⚠️ Git 未安装，跳过"
fi

echo ">>> 配置 npm 代理..."
if command -v npm &> /dev/null; then
    npm config set proxy ${PROXY}
    npm config set https-proxy ${PROXY}
    echo "✅ npm 代理配置完成"
else
    echo "⚠️ npm 未安装，跳过"
fi

echo ">>> 验证代理连通性..."
if curl -x ${PROXY} https://www.google.com -I --silent | grep -q "200"; then
    echo "✅ 代理连通正常"
else
    echo "❌ 代理连通失败"
    exit 1
fi

echo ">>> 全部完成！"
