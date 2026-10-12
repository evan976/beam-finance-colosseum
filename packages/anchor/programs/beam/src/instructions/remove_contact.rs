use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct RemoveContact<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [CONTACT_SEED, owner.key().as_ref(), address.as_ref()],
        bump = contact.bump,
        constraint = contact.owner == owner.key() @ ErrorCode::Unauthorized,
        close = owner,
    )]
    pub contact: Account<'info, Contact>,
}

pub(crate) fn handler(_ctx: Context<RemoveContact>, address: Pubkey) -> Result<()> {
    msg!("Contact removed: {}", address);
    Ok(())
}
