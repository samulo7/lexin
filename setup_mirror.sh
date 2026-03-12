#!/bin/bash

set -e

MIRROR="https://proxy.775774.xyz"

echo ">>> 配置 Docker 镜像加速..."

# 备份原有配置
if [ -f /etc/docker/daemon.json ]; then
    cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
    echo ">>> 已备份原配置到 daemon.json.bak"
fi

# 写入配置
cat > /etc/docker/daemon.json << EOF
{
  "registry-mirrors": ["${MIRROR}"]
}
EOF

# 重启 Docker
echo ">>> 重启 Docker..."
systemctl daemon-reload
systemctl restart docker

# 验证配置
echo ">>> 验证配置..."
if docker info 2>/dev/null | grep -q "$MIRROR"; then
    echo "✅ 镜像加速配置成功: $MIRROR"
else
    echo "❌ 配置失败，请检查 /etc/docker/daemon.json"
    exit 1
fi

# 验证拉取
echo ">>> 测试拉取 hello-world..."
if docker pull hello-world > /dev/null 2>&1; then
    echo "✅ 镜像拉取测试成功"
    docker rmi hello-world > /dev/null 2>&1
else
    echo "❌ 镜像拉取失败，请检查代理服务是否正常"
    exit 1
fi

echo ">>> 全部完成！后续直接使用 docker pull 即可自动走加速代理"