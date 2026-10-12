use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct ApproveReimbursement<'info> {
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
        constraint = reimbursement.treasury == treasury.key(),
        constraint = reimbursement.status == Reimbursement::PENDING @ ErrorCode::InvalidReimbursementStatus,
    )]
    pub reimbursement: Account<'info, Reimbursement>,

    #[account(
        mut,
        seeds = [EMPLOYEE_SEED, treasury.key().as_ref(), reimbursement.employee.as_ref()],
        bump = employee_info.bump,
    )]
    pub employee_info: Account<'info, Employee>,

    pub clock: Sysvar<'info, Clock>,
}

pub(crate) fn handler(ctx: Context<ApproveReimbursement>) -> Result<()> {
    let amount = ctx.accounts.reimbursement.amount;

    let employee_info = &mut ctx.accounts.employee_info;
    employee_info.pending_reimbursement = employee_info
        .pending_reimbursement
        .checked_add(amount)
        .unwrap();

    let reimbursement = &mut ctx.accounts.reimbursement;
    reimbursement.status = Reimbursement::APPROVED;
    reimbursement.approved_by = Some(ctx.accounts.admin.key());
    reimbursement.approved_at = Some(ctx.accounts.clock.unix_timestamp);

    msg!(
        "Reimbursement approved: {} tokens added to pending for {}",
        amount,
        reimbursement.employee
    );
    Ok(())
}
