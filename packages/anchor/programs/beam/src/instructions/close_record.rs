use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct CloseRecord<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump = treasury.bump,
        has_one = admin @ ErrorCode::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    /// CHECK: validated in the handler as a treasury-owned Payroll,
    /// Reimbursement, or Transfer account
    #[account(
        mut,
        constraint = record.owner == &crate::ID @ ErrorCode::Unauthorized,
    )]
    pub record: UncheckedAccount<'info>,
}

pub(crate) fn handler(ctx: Context<CloseRecord>) -> Result<()> {
    let treasury_key = ctx.accounts.treasury.key();
    let record_data = ctx.accounts.record.try_borrow_data()?;

    let belongs_to_treasury = Payroll::try_deserialize(&mut &record_data[..])
        .map(|record| record.treasury == treasury_key)
        .unwrap_or(false)
        || Reimbursement::try_deserialize(&mut &record_data[..])
            .map(|record| record.treasury == treasury_key)
            .unwrap_or(false)
        || Transfer::try_deserialize(&mut &record_data[..])
            .map(|record| record.treasury == treasury_key)
            .unwrap_or(false);

    require!(belongs_to_treasury, ErrorCode::Unauthorized);
    drop(record_data);

    let record = ctx.accounts.record.to_account_info();
    let admin = ctx.accounts.admin.to_account_info();

    let lamports = record.lamports();
    **record.try_borrow_mut_lamports()? = 0;
    **admin.try_borrow_mut_lamports()? += lamports;

    record.resize(0)?;
    record.assign(&anchor_lang::system_program::ID);

    msg!("Record closed, {} lamports recovered", lamports);
    Ok(())
}
