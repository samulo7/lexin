#!/bin/bash

set -e

PROXY="http://35.212.182.155:3128"

echo ">>> 配置系统全局代理..."
cat >> /etc/profile << EOF
export http_proxy=${PROXY}
export https_proxy=${PROXY}
export no_proxy=localhost,127.0.0.1,内网IP段
EOF
source /etc/profile

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
git config --global http.proxy ${PROXY}
git config --global https.proxy ${PROXY}

echo ">>> 配置 npm 代理..."
npm config set proxy ${PROXY}
npm config set https-proxy ${PROXY}

echo ">>> 验证代理连通性..."
if curl -sx ${PROXY} https://www.google.com -o /dev/null; then
    echo "✅ 代理连通正常"
else
    echo "❌ 代理连通失败，请检查国外服务器是否正常"
    exit 1
fi

echo ">>> 验证 Docker..."
if docker pull hello-world > /dev/null 2>&1; then
    echo "✅ Docker 代理正常"
    docker rmi hello-world > /dev/null 2>&1
else
    echo "❌ Docker 代理失败"
    exit 1
fi

echo ">>> 验证 Git..."
if git ls-remote https://github.com/torvalds/linux.git HEAD > /dev/null 2>&1; then
    echo "✅ Git 代理正常"
else
    echo "❌ Git 代理失败"
    exit 1
fi

echo ">>> 全部完成！"
