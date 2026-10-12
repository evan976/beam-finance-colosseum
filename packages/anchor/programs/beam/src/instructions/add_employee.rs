use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
#[instruction(employee: Pubkey)]
pub struct AddEmployee<'info> {
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
        init,
        payer = admin,
        space = Employee::SIZE,
        seeds = [EMPLOYEE_SEED, treasury.key().as_ref(), employee.as_ref()],
        bump,
    )]
    pub employee_info: Account<'info, Employee>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<AddEmployee>,
    employee: Pubkey,
    name: String,
    department: String,
    position: String,
    base_salary: u64,
) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;

    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);
    require!(
        department.len() <= MAX_DEPARTMENT_LEN,
        ErrorCode::DepartmentTooLong
    );
    require!(
        position.len() <= MAX_POSITION_LEN,
        ErrorCode::PositionTooLong
    );

    // Skip the vec push if the wallet is already present (legacy migration:
    // employee was added with the old instruction that had no Employee PDA).
    // Anchor's `init` on employee_info prevents true duplicates — it will
    // fail if the PDA account already exists.
    if !treasury.employees.contains(&employee) {
        require!(
            treasury.employees.len() < MAX_EMPLOYEES,
            ErrorCode::MaxEmployeesReached
        );
        treasury.employees.push(employee);
    }

    let employee_info = &mut ctx.accounts.employee_info;
    employee_info.wallet = employee;
    employee_info.treasury = treasury.key();
    employee_info.name = name;
    employee_info.department = department;
    employee_info.position = position;
    employee_info.base_salary = base_salary;
    employee_info.pending_reimbursement = 0;
    employee_info.bump = ctx.bumps.employee_info;

    msg!("Employee added: {}", employee);
    Ok(())
}
