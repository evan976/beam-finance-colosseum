# Beam Finance - Solana 链上企业财务管理系统  
**产品需求文档（PRD）**  
**版本：2.0**
**文档状态**：MVP + AI 功能版
**目标用户**：小型团队、初创公司、Web3 项目、自由职业者团队  
**文档日期**：2026 年 3 月 13 日  
**核心定位**：去中心化、透明、低成本的企业级财务工具，集成 AI 助手，聚焦工资发放、员工报销、团队内部转账，所有关键操作记录在 Solana 链上，支持自然语言管理财务。

## 1. 产品概述

### 一句话描述
Beam Finance 是一个基于 Solana 的链上企业财务管理系统，让老板从 treasury（资金池）发放工资、审批报销、执行转账，所有流水永久可审计，员工可实时查看自己的薪资与报销状态。

### 核心价值
- **完全透明 & 不可篡改**：所有工资、报销、转账记录永久上链
- **极低成本**：每笔操作 gas 费 < 0.001 SOL
- **实时性**：sub-second 确认，适合快速报销审批
- **零信任权限**：程序强制角色检查（老板 vs 员工）
- **无需中心服务器**：前端直接与链交互

### 目标场景（MVP 聚焦）
- 每月发工资（手动或批量）
- 员工出差/采购报销 → 老板审批 → 自动转账
- 团队内部转账（给供应商、奖金、借款等）
- 老板实时监控 treasury 余额与流水
- 员工查看个人财务记录

## 2. 用户角色与视角

| 角色       | 钱包类型       | 主要权限与可见内容                                                                 | UI 主要页面                     |
|------------|----------------|------------------------------------------------------------------------------------|---------------------------------|
| **老板 / Admin** | 公司创建者钱包 | 创建/管理 treasury、添加员工、发放工资、审批报销、执行转账、查看全团队流水与汇总 | 团队仪表盘、Treasury 管理、审批中心、流水总览 |
| **员工**   | 普通团队成员钱包 | 提交报销申请、查看自己的工资发放历史、查看自己的报销状态、查看个人转账记录       | 我的报销、我的薪资、提交报销   |

**视角切换方式**（前端实现）：
- 连接钱包后，自动检测当前钱包是否为 treasury admin
- 如果是 admin → 默认显示老板视角
- 提供下拉菜单或标签页切换“个人模式 / 公司模式”

## 3. MVP 核心功能清单（比赛优先级排序）

| 优先级 | 功能模块             | 详细描述                                                                 | Anchor 指令                     | 前端页面主要组件               | 预计耗时 |
|--------|----------------------|--------------------------------------------------------------------------|---------------------------------|--------------------------------|----------|
| P0     | 创建 Treasury        | 老板创建公司资金池，初始可转入 SOL / SPL Token                          | `create_treasury`               | 创建公司表单                   | 20 min   |
| P0     | 添加员工             | 老板输入员工钱包地址，加入公司员工列表                                  | `add_employee`                  | 员工管理列表 + 添加按钮        | 20 min   |
| P0     | 提交报销申请         | 员工填写金额、描述、附件哈希（可选），提交到链上                        | `submit_reimbursement`          | 报销提交表单                   | 30 min   |
| P0     | 审批报销             | 老板查看 pending 报销，approve → treasury 自动转账给员工                | `approve_reimbursement`         | 待审批列表 + Approve/Reject 按钮 | 40 min   |
| P0     | 发放工资             | 老板选择员工、输入金额、备注 → 从 treasury 转账并记录                   | `pay_salary`                    | 发工资表单（支持单人/批量）    | 40 min   |
| P0     | 通用转账             | 从 treasury 转账给任意地址（供应商、奖金等）                            | `transfer_from_treasury`        | 转账表单                       | 30 min   |
| P0     | 查看流水与记录       | 员工看自己记录，老板看全部；显示时间、金额、类型、状态                  | 查询 PDA（getProgramAccounts）  | 列表表格 + 筛选                | 40 min   |
| P1     | Treasury 余额显示    | 实时显示 treasury 当前余额（SOL 或 Token）                              | 查询账户余额                    | 大数字卡片                     | 15 min   |
| P1     | 简单汇总统计         | 本月 payroll 总额、本月报销总额、treasury 剩余                          | 前端聚合或简单 on-chain counter | 汇总卡片 / 小图表              | 20 min   |

## 4. 数据模型（Anchor Accounts）

```rust
// 公司资金池
#[account]
pub struct Treasury {
    pub admin: Pubkey,
    pub name: String,
    pub employees: Vec<Pubkey>,         // MVP 限制 20 人以内
    pub token_mint: Option<Pubkey>,     // None = native SOL，Some = SPL Token mint
    pub bump: u8,
}

// 工资发放记录
#[account]
pub struct Payroll {
    pub employee: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub memo: String,
    pub treasury: Pubkey,
}

// 报销记录
#[account]
pub struct Reimbursement {
    pub employee: Pubkey,
    pub amount: u64,
    pub description: String,
    pub status: u8,                     // 0=pending, 1=approved, 2=rejected
    pub approved_by: Option<Pubkey>,
    pub approved_at: Option<i64>,
    pub timestamp: i64,
    pub treasury: Pubkey,
}
```

## 5. 核心权限约束（Anchor 中实现）

- 只有 admin 可以：create_treasury、add_employee、approve_reimbursement、pay_salary、transfer_from_treasury
- 员工只能：submit_reimbursement（且必须是已加入的员工）
- 转账必须从 treasury 账户扣款，且 treasury 必须有足够余额

## 6. MVP 技术实现要点

- **链上**：Anchor program（Rust），使用 native SOL 或 SPL Token（推荐先用 SOL 简化）
- **前端**：Next.js App Router + Tailwind + shadcn/ui
- **钱包**：@solana/connector
- **交互**：@coral-xyz/anchor + @solana/web3.js
- **Monorepo**：Turborepo + bun
  - `apps/web`
  - `packages/anchor`
  - `packages/ui`
- **部署**：devnet（免费），本地 validator 也可用于演示
- **RPC**：Helius dev RPC 或 QuickNode（免费额度足够）

## 7. 交付标准

- 能在 3 分钟内完成一次闭环演示：
  1. 老板创建 treasury 并转入资金
  2. 添加一名员工
  3. 员工提交一笔报销
  4. 老板 approve → 员工收到转账
  5. 老板手动发一笔工资
  6. 双方分别查看自己的记录和 treasury 余额
- 界面清晰：老板视角 vs 员工视角明显区分
- 交易确认后列表实时刷新（polling 或简单订阅）

## 8. 风险与缓解

| 风险                     | 缓解措施                                      |
|--------------------------|-----------------------------------------------|
| SPL Token 集成复杂       | MVP 先只支持 native SOL，后面再加 Token       |
| PDA 空间/租金计算错误    | 预留足够 space，测试时用 anchor test          |
| 员工列表 Vec 过长        | MVP 限制 20 人，超出提示升级                  |
| RPC 延迟 / 限速          | 本地 validator + devnet 双模式演示            |
| 余额不足转账失败         | 前端提前检查 treasury 余额并提示              |

## 9. AI 功能（已实现）

### 9.1 AI 财务助手（全局聊天侧边栏）
- 自然语言查询财务数据（余额、工资、报销、转账记录）
- 基于角色的数据访问控制：
  - Admin：可查看国库余额、全部员工、所有记录
  - Employee：只能查看自己的工资、报销、转账记录
  - 任何人都无法查询员工个人钱包余额
- 技术栈：Vercel AI SDK v6 + DeepSeek API + Streamdown + AI Elements

### 9.2 AI Agent 操作（链上交易执行）
- 支持通过自然语言执行以下链上操作：
  - `add_employee` / `remove_employee`（Admin）
  - `pay_salary`（Admin）
  - `transfer_from_treasury` / `transfer_p2p`
  - `submit_reimbursement`（Employee）
  - `approve_reimbursement` / `reject_reimbursement`（Admin）
- 所有操作需用户钱包签名确认（Confirm & Sign 卡片）
- AI 会在信息不完整时主动追问

### 9.3 智能报销审核
- AI 分析待审批报销的风险等级（低/中/高）
- 基于报销金额、员工历史记录、部门上下文评估
- Admin 可一键 AI 审核所有待审批报销

### 9.4 交易异常检测
- AI 自动检测异常交易模式（重复支付、异常金额、高频交易等）
- 在 Dashboard 展示异常告警

## 10. 后续迭代方向

- 批量工资发放（CSV 导入）
- Multisig treasury（多人审批）
- 定时自动发薪（Clockwork 集成）
- 报销附件存储（Arweave / IPFS 哈希）
- 导出报表 / 会计对账
- 移动端适配
- AI 自动生成财务报告