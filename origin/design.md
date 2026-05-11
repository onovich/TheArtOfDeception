项目交接文档：等高线战役 (The Contour War)

1. 项目概述与命名

项目代号: The Contour War (等高线战役)

项目定位: 一款基于 React 和 Canvas 渲染的、结合《孙子兵法》宏观策略与沙盘推演的 RTS (即时战略) 微型游戏。

视觉风格: 冷战雷达风 / 极简几何风 / 军情推演终端。

核心体验: 玩家扮演帷幄之中的将军，通过在等高线地形上排兵布阵、利用高低差视野与射程优势、派遣斥候探查迷雾，最终剿灭敌军。

2. 需求设计文档 (PRD)

2.1 核心机制

地形系统 (等高线场域)

生成规则: 柏林噪音 (Perlin Noise) 叠加正弦波 (Sine Wave) 生成随机且具有走向的山脉与地形。

视觉表达: 采用阶梯色调表示不同高度，等高线密集处代表陡坡。

策略属性: 地形分为 5 级（洼地、平原、丘陵、高地、险峰）。高度直接影响移动速度（爬坡减速、下坡加速）、视野范围（站得高看得远）以及弓箭手的伤害与射程（高打低伤害加成，低打高伤害衰减）。

强制干预: 算法强制右侧（敌占区）生成高地，左侧生成低谷/平原，以制造防守方优势和进攻方挑战。

视野与战争迷雾系统 (Fog of War)

动态视野: 只有我方存活单位能提供视野光圈。

信息时效性 (迷雾自愈): 已探明的区域如果失去视野覆盖，会随着时间推移重新被迷雾笼罩（每帧叠加半透明黑底），模拟战场情报的时效性。

编组与阵型系统 (Formations)

玩家不可直接控制单兵，而是通过下达宏观军令控制“编组”。

预设 5 个编组：0组(帅旗/将军)、1组(步兵)、2组(步兵)、3组(弓箭)、4组(斥候)。

自动结阵: 根据兵种不同，移动时会自动排布不同阵型（步兵方阵、弓兵横阵、斥候散阵）。

群体 AI 与寻路 (Boids-based)

单位移动基于目标吸引力与同伴防重叠避让（Separation）。

敌方具备简单警戒与寻敌逻辑：弓兵倾向于拉开距离并在高地驻守，步兵倾向于近战冲锋。

战斗与物理反馈

弓箭弹道: 弓箭手攻击有飞行弹道，命中造成范围伤害，并附带火花与飙血粒子特效。

近战冲撞: 步兵交战时会有身体前倾的冲刺动画表现。

尸骸遗迹: 单位阵亡后会在沙盘上留下永久的尸骸标记。

2.2 游戏流程

部署阶段 (SETUP):

全图迷雾笼罩，但沙盘地形可见。

敌方营地以模糊的雷达波纹标出。

玩家必须在限定的“蓝色空降区”内点击，部署全军。

交战阶段 (BATTLE):

部署完毕后，战争迷雾启动。

玩家通过点击沙盘上的“阵眼”(编组数字) 或下方 UI 面板切换控制编组。

下达移动/攻击指令，利用地形和兵种克制进行博弈。

可手动切换天气（晴朗/浓雾），浓雾会大幅削减所有单位视野。

结算阶段 (VICTORY / DEFEAT):

胜利条件: 歼灭地图上所有敌军。进入下一关（难度递增，生成新地形）。

失败条件: 我方主将（菱形图标）阵亡。重置回第 1 关。

3. 技术文档

3.1 技术栈

框架: React 18+ (使用 Hooks: useState, useEffect, useRef)

渲染: HTML5 <canvas> (纯 Canvas 2D API 渲染引擎)

样式: Tailwind CSS (用于外层 UI 和布局)

打包/构建: 无特定依赖，单文件组件 (SFC) 结构，可直接嵌入任何 React 环境。

3.2 核心模块与数据结构

项目所有代码集中在 App.jsx 单文件中。

1. 地形与数学模块 (Math & Terrain)

SEED: 全局随机种子，用于控制关卡地形生成。

hash(x, y), noise(x, y): 自定义简易 Perlin Noise 实现。

getElevation(x, y, width, height): 核心地形生成函数，融合噪音、正弦波和区域偏置 (Bias)。

getHeightTier(h): 将连续的高度值 (0-1) 映射为 5 个离散的地形层级和颜色。

2. 实体类 (Entities)

class Unit: 游戏基础单位。包含坐标、阵营、兵种类型、生命值、攻击力、视野、当前目标位置 (targetPos) 等属性。

class Arrow: 弓箭飞行物。包含起始点、目标点、伤害值、飞行进度 (progress) 和高地标识 (isHighGround)。

class Particle: 粒子特效。用于实现飙血和火花，具有简单的运动学属性和生命周期。

3. React 主组件 (App Component)

State (useState):

gameState: 游戏当前大阶段 ('SETUP', 'BATTLE', 'VICTORY', 'DEFEAT')。

level: 当前关卡数。

logs: 战场日志数组。

selectedSquad: 当前选中的编组 ID。

Refs (useRef):

canvasRef, fowCanvasRef, bgCanvasRef: 分别用于渲染主画面、战争迷雾遮罩和静态地形底图的三层 Canvas。

engine: 核心游戏引擎状态容器。为了避免 React re-render 打断帧动画循环，所有高频物理、AI 计算所需的状态（如实体数组、画布尺寸、地形高度场数组等）都存储于此。

核心函数:

startLevel(currentLevel): 初始化/重置关卡，生成新地形和敌军。

initTerrain(): 预渲染静态地形到底图 Canvas，并将高度数据存储在 Float32Array 中以供快速查询。

gameLoop(): requestAnimationFrame 驱动的主循环。

updateEngine(): 负责每一帧的逻辑运算：处理粒子、飞矢、单位寻路、AI索敌、碰撞伤害判定、更新迷雾以及检查胜负条件。

renderFrame(): 负责每一帧的画面绘制：按层级绘制地形、尸骸、指示线、阵眼、单位、飞矢、粒子和迷雾。

handleCanvasClick(e): 处理玩家在 Canvas 上的点击交互（部署、选组、下达移动指令）。

3.3 性能优化点

分层渲染: 静态地形预渲染在 bgCanvasRef 上，每帧只需 drawImage，避免重复计算庞大的 Perlin Noise。

高度场缓存: 地形高度数据预先缓存在一维 Float32Array (engine.current.terrain) 中，单位在寻路时通过坐标索引直接获取高度，复杂度为 $O(1)$。

状态分离: 将渲染层 (Canvas 绘制) 与 UI 层 (React State) 分离，高频的位移和生命值变化不触发 React 重渲染，保证 60 FPS 稳定运行。

4. 项目启动方式

由于项目采用了单文件 React 组件架构，启动方式非常简单：

方式一：在线沙盒 (CodeSandbox / StackBlitz)

创建一个基于 React (如 Create React App 或 Vite-React) 的在线沙盒项目。

确保环境支持 Tailwind CSS (大多数现代模板已内置)。

将 App.jsx 的全部代码复制并替换沙盒中的主要组件文件 (通常是 src/App.js 或 src/App.jsx)。

保存并运行即可预览。

方式二：本地 Vite 开发环境

确保本地已安装 Node.js。

在终端执行以下命令创建并启动项目：

# 创建 Vite + React 项目
npm create vite@latest contour-war -- --template react
cd contour-war

# 安装依赖
npm install

# 安装 Tailwind CSS (如果需要修改外部样式)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


配置 Tailwind (如果执行了上一步):

修改 tailwind.config.js:

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}


修改 src/index.css: 添加 @tailwind base; @tailwind components; @tailwind utilities;

核心步骤: 将交接提供的 App.jsx 代码完全替换 src/App.jsx 文件内容。

启动开发服务器：

npm run dev


5. 后续开发建议 (To 接手 AI/开发者)

AI 升级: 当前敌军 AI 较弱（基于距离的简单索敌）。可以引入流场寻路 (Flow Field Pathfinding) 解决复杂地形下的卡顿问题，并为敌方指挥官设计更高级的博弈策略（如主动包抄、撤退诱敌）。

技能系统: 为玩家将军添加主动技能（如：发射信号弹短暂照亮区域、全军冲锋加速、呼叫火箭支援），技能存在冷却时间。

地形交互: 增加动态地形元素（如河流减速、草丛隐蔽），或者允许弓兵发射火箭点燃草丛，火势随风向蔓延。

性能极限: 优化粒子系统和碰撞检测逻辑，尝试将当前支持的百人同屏上限提升至千人规模。

文档创建于：2026年5月