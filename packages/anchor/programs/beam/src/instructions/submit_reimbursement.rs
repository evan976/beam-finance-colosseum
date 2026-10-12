use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(record_id: u64, amount: u64, description: String)]
pub struct SubmitReimbursement<'info> {
    #[account(mut)]
    pub employee: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, treasury.admin.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = employee,
        space = Reimbursement::SIZE,
        seeds = [
            REIMBURSEMENT_SEED,
            treasury.key().as_ref(),
            employee.key().as_ref(),
            &record_id.to_le_bytes(),
        ],
        bump,
    )]
    pub reimbursement: Account<'info, Reimbursement>,

    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<SubmitReimbursement>,
    _record_id: u64,
    amount: u64,
    description: String,
) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(
        description.len() <= MAX_DESCRIPTION_LEN,
        ErrorCode::DescriptionTooLong
    );

    let treasury = &ctx.accounts.treasury;
    require!(
        treasury.employees.contains(&ctx.accounts.employee.key()),
        ErrorCode::EmployeeNotFound
    );

    let reimbursement = &mut ctx.accounts.reimbursement;
    reimbursement.employee = ctx.accounts.employee.key();
    reimbursement.amount = amount;
    reimbursement.description = description;
    reimbursement.status = Reimbursement::PENDING;
    reimbursement.approved_by = None;
    reimbursement.approved_at = None;
    reimbursement.timestamp = ctx.accounts.clock.unix_timestamp;
    reimbursement.treasury = ctx.accounts.treasury.key();
    reimbursement.bump = ctx.bumps.reimbursement;

    msg!("Reimbursement submitted: {} lamports", amount);
    Ok(())
}
