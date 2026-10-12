use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct AddContact<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Contact::SIZE,
        seeds = [CONTACT_SEED, owner.key().as_ref(), address.as_ref()],
        bump,
    )]
    pub contact: Account<'info, Contact>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<AddContact>,
    address: Pubkey,
    name: String,
) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);

    let contact = &mut ctx.accounts.contact;
    contact.owner = ctx.accounts.owner.key();
    contact.address = address;
    contact.name = name;
    contact.bump = ctx.bumps.contact;

    msg!("Contact added: {}", address);
    Ok(())
}
