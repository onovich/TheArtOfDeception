# The Art of Deception
The Art of Deception is a radar-styled micro RTS prototype about terrain control, fog of war, and squad-level command, rebuilt into a runnable Vite + React project from a single-file canvas prototype.<br/>**The Art of Deception 是一个围绕地形压制、战争迷雾与编组指挥展开的雷达风微型 RTS 原型，现已从单文件 Canvas 原型整理为可运行的 Vite + React 工程。**

## Overview
This repository preserves the original source in origin/App.jsx and now uses a structured src/ entry for ongoing development, build automation, and GitHub Pages deployment.<br/>**该仓库保留了 origin/App.jsx 中的原始源码，并已建立结构化的 src/ 入口，用于后续开发、自动构建与 GitHub Pages 部署。**
This is an architecture-ready migration baseline for future Unity porting, not a claim that every gameplay responsibility has already been fully extracted from the prototype.<br/>**当前状态是面向未来 Unity 迁移的架构基础，并不宣称原型中的所有玩法职责都已经完成全量抽离。**

## Features
- Procedural contour terrain shapes every battle around elevation advantage and defensive positioning.<br/>**程序化等高线地形让每场战斗都围绕高低差优势与防守阵地展开。**
- Fog of war, squad formations, ranged volleys, melee impacts, and battlefield remains are rendered directly on layered canvases.<br/>**战争迷雾、编组阵型、远程齐射、近战冲击与战场尸骸都直接在分层 Canvas 上渲染。**
- The deployment flow preserves the original prototype feel while making the project buildable, maintainable, and publishable.<br/>**部署流程在保留原始原型体验的同时，让项目具备可构建、可维护、可发布的正式工程形态。**

## Architecture
- Shared world constants, terrain tiers, squad metadata, and deployment parameters live in src/data/gameConfig.js.<br/>**共享世界常量、地形层级、编组元数据与部署参数集中在 src/data/gameConfig.js。**
- Terrain generation, entity models, formation assignment, spawn rules, and engine state factories live in src/logic/engine/.<br/>**地形生成、实体模型、编组目标分配、出生规则与引擎状态工厂位于 src/logic/engine/。**
- The requestAnimationFrame battle loop and canvas bridge live in src/logic/hooks/useContourWarGame.js, which also fixes the prototype's long-running state sync risk by keeping runtime state in refs for the render loop.<br/>**requestAnimationFrame 战斗循环与 Canvas 桥接位于 src/logic/hooks/useContourWarGame.js，并通过在渲染循环中使用 refs 保持运行时状态同步，修正了原型长时运行时的状态闭包风险。**
- The React screen shell and presentational panels live in src/view/screens/ and src/view/components/.<br/>**React 的 Screen 外壳与表现层面板位于 src/view/screens/ 与 src/view/components/。**
- The original prototype remains intact in origin/App.jsx as a fallback reference during future refactors.<br/>**原始原型仍完整保留在 origin/App.jsx，作为后续继续重构时的回填参考。**

## Setup
Install dependencies.<br/>**安装依赖。**
```sh
npm install
```
Start the verified development server.<br/>**启动已验证可用的开发服务器。**
```sh
npm run dev
```
Build the verified production bundle.<br/>**构建已验证通过的生产包。**
```sh
npm run build
```

## Deployment
GitHub Pages is configured through GitHub Actions in .github/workflows/deploy.yml and expects the repository subpath base /TheArtOfDeception/.<br/>**GitHub Pages 通过 .github/workflows/deploy.yml 中的 GitHub Actions 工作流部署，并使用仓库子路径基座 /TheArtOfDeception/。**
After pushing to the main branch, set Repository Settings > Pages > Source to GitHub Actions.<br/>**推送到 main 分支后，请在仓库 Settings > Pages > Source 中切换为 GitHub Actions。**
The expected public preview URL is https://onovich.github.io/TheArtOfDeception/.<br/>**预期的公开预览地址为 https://onovich.github.io/TheArtOfDeception/。**

## Status
The current refactor establishes clean migration boundaries for terrain rules, entity spawning, formation logic, and UI composition, while keeping some battle update and canvas coordination inside the hook for delivery stability.<br/>**当前重构已经为地形规则、实体生成、编组逻辑与界面组装建立了清晰迁移边界，同时为了交付稳定性，仍保留部分战斗更新与 Canvas 协调逻辑在 Hook 中。**
The repository is now ready for Git initialization, remote push, and GitHub Pages rollout.<br/>**仓库现已具备 Git 接管、远端推送与 GitHub Pages 发布的条件。**