---
title: 使用轻量应用服务器部署的问题总结
published: 2026-08-13
pinned: false
description: 为拓展新的功能，本站已迁移至阿里云轻量应用服务器，本文记录博主在部署过程中遇到的一些问题整理
image: ../images/firefly/firefly-deploy-systemRE/firefly-deploy-systemRE.png
tags: [Firefly, 指南, 部署]
category: firefly
slug: firefly/firefly-deploy-systemRE
---

## 开始之前...

本站近期扩装了 [AI聊天功能](/chat/) ，Netlify 的 Serverless Function 在执行时长和内存上有限制，不适合承载后端服务，其冷启动与调用时间的限制导致体验较差，虽然 Netlify 的付费计划可以提升执行时长上限，但冷启动问题依然存在，且综合考虑价格与拓展性，远没有直接租一台云服务器划算，于是决定一劳永逸，将本站迁移至云服务器部署，这个过程总计花费了大概16天的时间

> [!IMPORTANT] 重要
> 
> **使用 Netlify 部署的方案依旧可行且推荐，如有需要请跳转下方链接**

[[firefly-260730]]

## 必要的准备工作

**博主使用国内的服务器进行部署，提前做了以下准备**
- 一个可以正常使用的域名
- 一张对应域名的SSL证书（可选）
- 一台轻量应用服务器（镜像为 Ubuntu）
- DNS云解析
- 服务器备案

> [!CAUTION] 注意
> 
> **是否需要申请备案与你的所在地无关，只与服务器位置有关**
> 
> **如果使用的服务器部署在国内，就必须提前申请备案**

博主备案实际用时约11天（7个工作日），参考时间为20个工作日，相比之下博主的备案可以说是相当顺利

域名直接使用 DNS 解析到服务器的公网IP，在服务器上使用 Nginx 代理构建好的静态站，即可实现使用域名访问服务器

如果要配置 HTTPS ，轻量应用服务器需要在服务器内部安装 SSL 证书，手动配置证书链

## 服务器环境搭建

由于本站需要与后端 API 交互，所以博主采取使用 nodejs 进程执行渲染，Nginx 提供反向代理的策略

**安装 [Nginx](https://nginx.org/) 与 [node.js](https://nodejs.org/)**

```bash
# 安装Nginx
sudo apt update
sudo apt install nginx -y
```

```bash
# 安装node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 构建

博主购买的是一台2核2G内存的轻量应用服务器，2G内存的服务器在 pnpm build 进行项目构建时会直接死机，即便加了2G的 swap ，也无法坚持到构建完毕，因此，我们选择了其他的手段

由于项目为静态站，我们选择本地构建，直接运行 pnpm build ，将构建出来的 dist/ 发送给服务器

```powershell
# 本机
cd C:\......\Firefly-Docs
pnpm build
scp -r .\dist\* 用户名@服务器公网IP:/var/www/Firefly/dist/
```

```bash
# 服务器上不存在目录时先创建
mkdir -p /var/www/Firefly/dist

# 权限处理（非admin账号上传后没有权限读取 www-data）
sudo chmod -R a+rX /var/www/Firefly/dist
sudo chown -R www-data:www-data /var/www/Firefly/dist
```

**如果不调整权限，服务器无法读取构建后的文件，可能会导致样式丢失**

## Nginx 站点配置

```bash
# 书写配置文件
sudo nano /etc/nginx/sites-available/firefly
# 创建一个符号链接（快捷方式）
sudo ln -s /etc/nginx/sites-available/firefly /etc/nginx/sites-enabled/firefly
# 删除nginx自带的默认站点配置
sudo rm -f /etc/nginx/sites-enabled/default
# 测试配置文件语法是否正确 并 平滑重载配置（不会中断已有连接）
sudo nginx -t && sudo systemctl reload nginx
```

**配置示例**

```nginx
# 80 → 跳 HTTPS
server {
    listen 80;
    server_name www.firmamentum.cn firmamentum.cn;
    return 301 https://www.firmamentum.cn$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name www.firmamentum.cn firmamentum.cn;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/cert.key;

    root /var/www/Firefly/dist;
    index index.html;

    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 如有后端程序，可以在这里进行配置
    location /.../ {
        ......
    }

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

## HTTPS证书

使用的是 Nginx 代理，直接下载 Nginx 证书，将下载好的证书传到服务器上

```powershell
# 本机上传证书到服务器
scp ".\www.firmamentum.cn.pem" 用户名@服务器公网IP:~/
scp ".\www.firmamentum.cn.key" 用户名@服务器公网IP:~/
```

阿里云 Nginx 包常见只有 .pem + .key，下载到本机后上传至服务器

```bash
# 创建文件夹
sudo mkdir -p /etc/nginx/ssl
# 存放刚刚上传的证书
sudo mv /root/www.firmamentum.cn.pem /etc/nginx/ssl/cert.pem
sudo mv /root/www.firmamentum.cn.key /etc/nginx/ssl/cert.key
# 收紧访问权限，只有 root 能读写这个文件，其他人一律无权访问。
sudo chmod 600 /etc/nginx/ssl/cert.key

# 检查链
grep -c "BEGIN CERTIFICATE" /etc/nginx/ssl/cert.pem
echo | openssl s_client -connect 127.0.0.1:443 -servername www.firmamentum.cn -showcerts 2>/dev/null | grep -E '^ [0-9]+ s:'

# 无误后重载配置
sudo nginx -t && sudo systemctl reload nginx
```

理想情况会发出 3 张：站点证 + WoTrus 中间证 + Sectigo 过渡证

*由于本站是从 Netlify 迁移至云服务器，迁移时博主没有移除域名指向 Netlify 的 DNS 解析，导致测试时 Nginx 证书链正常，但域名一直异常*

*因此在关闭掉原服务后一定要一并将 DNS 解析移除，否则该域名会被指向错误的地址*

*提前删除不需要的 DNS 解析也可以更早的完成 DNS 传播*

<i style="color:#FF69B4;">在这里卡了两个多小时，证书重新配置了三次才发现域名的 DNS 解析没有去除，域名仍指向原地址而非我的服务器公网IP，好痛苦！！</i>

## 域名 DNS

**添加一条记录类型为：`A（将域名指向一个IPv4地址）`，值为`服务器公网IP`的记录**

必须删除原先指向旧站的 DNS 解析，否则访问域名就会指向停用的地址... 并且 DNS 传播需要2-48小时，改的越早生效越早

如果需要测试域名、服务器、证书等是否配置完毕，可以将自己的IPv4地址修改为8.8.8.8进行测试

Win11 IPv4地址系统修改方式如下：

设置 → 网络和 Internet → 当前网络 → DNS 服务器分配 → 手动：
- 首选：`8.8.8.8`
- 备用：`1.1.1.1`

```powershell
# 清除本地 DNS 缓存
ipconfig /flushdns
```

访问你的域名，若能连通且未提示不安全，则配置成功

当然，如果不想要修改本机 IPv4地址，也可以使用移动端设备直接访问域名，移动端设备通常使用运营商的 DNS 服务器进行解析，如果运营商的 DNS 已更新记录，就能正常访问

## 日常更新

```powershell
# 本地构建
pnpm build
# 上传到服务器
scp -r .\dist\* 用户名@服务器公网IP:/var/www/Firefly/dist/
```

```bash
# 修改 Nginx 配置
sudo nano /etc/nginx/sites-available/firefly
sudo nginx -t && sudo systemctl reload nginx
```