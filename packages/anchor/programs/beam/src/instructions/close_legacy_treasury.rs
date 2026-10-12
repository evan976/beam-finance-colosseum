use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;

#[derive(Accounts)]
pub struct CloseLegacyTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: old treasury PDA — verified by seeds, not deserialized
    #[account(
        mut,
        seeds = [TREASURY_SEED, admin.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: old vault PDA — verified by seeds
    #[account(
        mut,
        seeds = [VAULT_SEED, treasury.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<CloseLegacyTreasury>) -> Result<()> {
    let vault_balance = ctx.accounts.vault.lamports();
    if vault_balance > 0 {
        let treasury_key = ctx.accounts.treasury.key();
        let vault_seeds: &[&[u8]] = &[
            VAULT_SEED,
            treasury_key.as_ref(),
            &[ctx.bumps.vault],
        ];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin.to_account_info(),
                },
                &[vault_seeds],
            ),
            vault_balance,
        )?;
    }

    let treasury_info = ctx.accounts.treasury.to_account_info();
    let admin_info = ctx.accounts.admin.to_account_info();
    let treasury_lamports = treasury_info.lamports();

    **treasury_info.try_borrow_mut_lamports()? = 0;
    **admin_info.try_borrow_mut_lamports()? += treasury_lamports;
    treasury_info.resize(0)?;
    treasury_info.assign(&anchor_lang::system_program::ID);

    msg!("Legacy treasury closed, {} lamports recovered from vault", vault_balance);
    Ok(())
}
