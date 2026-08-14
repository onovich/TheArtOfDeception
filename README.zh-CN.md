# TheArtOfDeception

[English](README.md)

[在线试玩](https://blog.onovich.com/TheArtOfDeception/)

TheArtOfDeception 是一个雷达风微型 RTS。玩家需要部署部队、观察等高线地形，并利用战争迷雾、高低差与编组指挥击败更强的敌军。

![TheArtOfDeception 封面](docs/cover.png)

## 玩法

- 在标记的初始区域内部署军队。
- 从指挥面板选择全军，或选择某个带编号的小队。
- 点击战场下达移动命令。
- 让弓兵占据高地，用步兵守住阵地，或把敌人引入不利地形。
- 保护主将，并消灭所有敌军。

## 主要特点

- 程序化等高线地形，高度会影响移动与伤害优势。
- 战争迷雾，以及受天气影响的视野。
- 步兵、弓兵、斥候、主将和小队阵型目标。
- 远程齐射、近战冲击、战场残骸和战术事件日志。
- 运行在 Vite 与 React 应用中的分层 Canvas 渲染。

## 开发

安装依赖并启动本地应用：

```bash
npm install
npm run dev
```

构建并预览生产版本：

```bash
npm run build
npm run preview
```

## 项目结构

- `src/data/gameConfig.js` 保存地形、部队、部署和界面共享数据。
- `src/logic/engine/` 保存地形生成、实体、阵型和生成规则。
- `src/logic/hooks/useContourWarGame.js` 负责战斗循环与 Canvas 桥接。
- `src/view/` 保存战场、指挥面板、状态、战前说明和战斗日志。
- `origin/` 保留原始单文件原型与设计说明。

## 当前状态

当前浏览器版本是一个可玩的战术原型，已经包含部署、编组指挥、地形影响、战争迷雾、胜利和失败条件。部分战斗循环与 Canvas 协调仍保留在主玩法 Hook 中，仓库也没有自动化测试。它应被视为范围集中的原型，而不是完成的 RTS。

## 许可证

当前仓库尚未包含开源许可证。
