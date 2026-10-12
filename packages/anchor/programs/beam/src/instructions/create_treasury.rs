use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

const ADMIN_WHITELIST: &[&str] = &[
    // Add allowed admin wallet pubkeys here.
    // When this list is empty, anyone can create a treasury (open mode).
    // "YourAdminPubkey1111111111111111111111111111111",
];

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Treasury::SIZE,
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = treasury,
        seeds = [VAULT_SEED, treasury.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<CreateTreasury>, name: String) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);

    if !ADMIN_WHITELIST.is_empty() {
        let admin_key = ctx.accounts.admin.key().to_string();
        require!(
            ADMIN_WHITELIST.iter().any(|&k| k == admin_key),
            ErrorCode::NotWhitelistedAdmin
        );
    }

    let treasury = &mut ctx.accounts.treasury;
    treasury.admin = ctx.accounts.admin.key();
    treasury.name = name;
    treasury.employees = Vec::new();
    treasury.token_mint = ctx.accounts.token_mint.key();
    treasury.bump = ctx.bumps.treasury;
    treasury.vault_bump = ctx.bumps.vault;

    msg!("Treasury created: {}", treasury.name);
    Ok(())
}
