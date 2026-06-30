# Render 部署步骤

这个项目不是纯静态网页，需要 Node.js 服务代理行情接口。Render 的 Web Service 比 Static Site 更适合。

## 1. 上传到 GitHub

在 GitHub 新建一个仓库，然后把本项目推上去。

## 2. 创建 Render Web Service

1. 打开 Render。
2. 选择 New > Web Service。
3. 连接你的 GitHub 仓库。
4. 配置：

```text
Runtime: Node
Build Command: 留空
Start Command: node server.js
Health Check Path: /api/health
```

## 3. 设置环境变量

必填：

```text
HOST=0.0.0.0
```

建议设置密码保护：

```text
ADMIN_USER=你的用户名
ADMIN_PASSWORD=你的密码
```

## 4. 部署完成

部署成功后，Render 会给一个网址，类似：

```text
https://market-flow-board.onrender.com
```

手机 Safari 可以直接打开并添加到主屏幕。

## 5. 后续维护

本地可以运行：

```bash
./check.sh
```

确认东方财富的 A股板块、个股 Top10、美股 ETF 数据接口是否还可用。
