---
layout: article.njk
title: Mac 上装 quickq，权限那几步别跳过
description: macOS Sonoma 14.5 安装 quickq 2.8.4 的步骤，含 Apple 芯片权限与菜单栏用法。
date: 2026-05-30
category: macOS 客户端
tags: ["macOS客户端", "安装教程", "权限设置"]
heroImage: "https://tse-mm.bing.com/th?q=quickq%20macOS%20install%20steps"
heroAlt: "quickq macOS 安装步骤"
---

M 系列和 Intel Mac 装 quickq 流程差不多，差别主要在第一次打开时的安全提示。我上周升级 macOS Sonoma 14.5 后重装了一遍客户端 2.8.4，菜单栏图标没出来，后来发现是权限没给全。

## 装之前确认设备

苹果菜单 → 关于本机，看芯片类型和系统版本。建议 macOS 13 Ventura 以上，存储留 150MB。用公司 Mac 的话，先确认能装第三方应用。

![quickq macOS 安装界面](https://tse-mm.bing.com/th?q=quickq%20macOS%20app%20install)

## 安装步骤

**第 1 步：下载对应安装包**

从下载中心拿 `.dmg` 文件，双击挂载。

**第 2 步：拖进应用程序文件夹**

把 quickq 图标拖到 Applications 快捷方式里，弹出磁盘映像。

**第 3 步：首次打开并过安全提示**

第一次启动如果提示「无法验证开发者」，去系统设置 → 隐私与安全性，点「仍要打开」。

**第 4 步：给网络权限**

按弹窗指引，在系统设置里允许 quickq 添加 VPN 配置和网络扩展。这一步跳过的话，客户端能开但连不上。

**第 5 步：菜单栏确认**

连上后看顶部菜单栏有没有 quickq 图标。没有的话退出重开，或检查「登录时打开」有没有勾。

## 菜单栏日常用法

点菜单栏图标比反复开主窗口快。写文档、开会时切线路、看状态，两秒搞定。图标灰色是未连接，彩色是已连接。

## 常见问题

**提示「网络扩展被阻止」？**  
系统设置 → 网络 → 过滤器，把 quickq 从阻止列表移出来，重启客户端。

**连上后 Safari 正常、Chrome 不行？**  
Chrome 可能装了代理类扩展，先禁用扩展试一次。

**换 Wi-Fi 后断连？**  
等 Mac 自动重连新网络，大概 10 秒，再点连接。别连着点。

**Intel Mac 比 M 系列慢？**  
正常，老机器后台程序多也会拖慢。关几个不用的 App 再试。
