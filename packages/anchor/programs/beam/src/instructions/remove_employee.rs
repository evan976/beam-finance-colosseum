use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(employee: Pubkey)]
pub struct RemoveEmployee<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump = treasury.bump,
        has_one = admin @ ErrorCode::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, treasury.key().as_ref(), employee.as_ref()],
        bump = employee_info.bump,
        constraint = employee_info.treasury == treasury.key() @ ErrorCode::Unauthorized,
        close = admin,
    )]
    pub employee_info: Account<'info, Employee>,
}

pub(crate) fn handler(ctx: Context<RemoveEmployee>, employee: Pubkey) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;

    let idx = treasury
        .employees
        .iter()
        .position(|e| *e == employee)
        .ok_or(ErrorCode::EmployeeNotFound)?;

    treasury.employees.swap_remove(idx);
    msg!("Employee removed: {}", employee);
    Ok(())
}
