use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
pub struct CloseTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump = treasury.bump,
        close = admin,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [VAULT_SEED, treasury.key().as_ref()],
        bump = treasury.vault_bump,
        token::authority = treasury,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Admin's token account to receive remaining vault balance
    /// CHECK: validated as associated token account by caller
    #[account(mut)]
    pub admin_token_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub(crate) fn handler(ctx: Context<CloseTreasury>) -> Result<()> {
    let admin_key = ctx.accounts.admin.key();
    let treasury_bump = ctx.accounts.treasury.bump;
    let signer_seeds: &[&[u8]] = &[TREASURY_SEED, admin_key.as_ref(), &[treasury_bump]];

    // Transfer remaining tokens from vault to admin
    let vault_balance = ctx.accounts.vault.amount;
    if vault_balance > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin_token_account.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[signer_seeds],
            ),
            vault_balance,
        )?;
        msg!("Drained {} tokens from vault", vault_balance);
    }

    // Close vault token account (rent → admin)
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.admin.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        },
        &[signer_seeds],
    ))?;

    // Treasury PDA is closed by `close = admin` in the account constraint
    msg!("Treasury and vault closed");
    Ok(())
}
