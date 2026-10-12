use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct RejectReimbursement<'info> {
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

    pub clock: Sysvar<'info, Clock>,
}

pub(crate) fn handler(ctx: Context<RejectReimbursement>) -> Result<()> {
    let reimbursement = &mut ctx.accounts.reimbursement;
    reimbursement.status = Reimbursement::REJECTED;
    reimbursement.approved_by = Some(ctx.accounts.admin.key());
    reimbursement.approved_at = Some(ctx.accounts.clock.unix_timestamp);

    msg!("Reimbursement rejected for {}", reimbursement.employee);
    Ok(())
}
