use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(record_id: u64, memo: String)]
pub struct PaySalary<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump = treasury.bump,
        has_one = admin @ ErrorCode::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = treasury,
        seeds = [VAULT_SEED, treasury.key().as_ref()],
        bump = treasury.vault_bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: employee wallet receiving salary
    #[account(mut)]
    pub employee: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, treasury.key().as_ref(), employee.key().as_ref()],
        bump = employee_info.bump,
        constraint = employee_info.treasury == treasury.key() @ ErrorCode::Unauthorized,
    )]
    pub employee_info: Account<'info, Employee>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = employee,
    )]
    pub employee_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        space = Payroll::SIZE,
        seeds = [
            PAYROLL_SEED,
            treasury.key().as_ref(),
            employee.key().as_ref(),
            &record_id.to_le_bytes(),
        ],
        bump,
    )]
    pub payroll: Account<'info, Payroll>,

    #[account(
        constraint = token_mint.key() == treasury.token_mint @ ErrorCode::InvalidTokenMint,
    )]
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<PaySalary>, _record_id: u64, memo: String) -> Result<()> {
    require!(memo.len() <= MAX_MEMO_LEN, ErrorCode::MemoTooLong);

    let treasury = &ctx.accounts.treasury;
    require!(
        treasury.employees.contains(&ctx.accounts.employee.key()),
        ErrorCode::EmployeeNotFound
    );

    let base = ctx.accounts.employee_info.base_salary;
    let reimb = ctx.accounts.employee_info.pending_reimbursement;
    let amount = base.checked_add(reimb).unwrap();
    require!(amount > 0, ErrorCode::InvalidAmount);

    let vault_balance = ctx.accounts.vault.amount;
    require!(vault_balance >= amount, ErrorCode::InsufficientFunds);

    let admin_key = treasury.admin;
    let treasury_seeds: &[&[u8]] = &[
        TREASURY_SEED,
        admin_key.as_ref(),
        &[treasury.bump],
    ];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.employee_token_account.to_account_info(),
                authority: ctx.accounts.treasury.to_account_info(),
            },
            &[treasury_seeds],
        ),
        amount,
    )?;

    let employee_info = &mut ctx.accounts.employee_info;
    employee_info.pending_reimbursement = 0;

    let payroll = &mut ctx.accounts.payroll;
    payroll.employee = ctx.accounts.employee.key();
    payroll.amount = amount;
    payroll.base_salary = base;
    payroll.reimbursement_amount = reimb;
    payroll.timestamp = ctx.accounts.clock.unix_timestamp;
    payroll.memo = memo;
    payroll.treasury = ctx.accounts.treasury.key();
    payroll.bump = ctx.bumps.payroll;

    msg!("Salary paid: {} tokens to {}", amount, payroll.employee);
    Ok(())
}
