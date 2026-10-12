// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @title BeamFinance
/// @notice EVM treasury / payroll / reimbursement / transfer logic aligned with the Solana Anchor program.
contract BeamFinance is Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  uint256 public constant MAX_EMPLOYEES = 20;
  uint256 public constant MAX_NAME_LEN = 32;
  uint256 public constant MAX_MEMO_LEN = 64;
  uint256 public constant MAX_DESCRIPTION_LEN = 128;
  uint256 public constant MAX_DEPARTMENT_LEN = 32;
  uint256 public constant MAX_POSITION_LEN = 32;

  string public constant VERSION = '0.1.0-evm';

  uint8 public constant REIMB_PENDING = 0;
  uint8 public constant REIMB_APPROVED = 1;
  uint8 public constant REIMB_REJECTED = 2;

  uint8 public constant TRANSFER_TREASURY_OUT = 0;
  uint8 public constant TRANSFER_P2P = 1;

  struct Treasury {
    address admin;
    string name;
    address[] employeeWallets;
    address token;
    bool exists;
  }

  mapping(address => Treasury) public treasuries;

  struct Employee {
    address wallet;
    address treasuryAdmin;
    string name;
    string department;
    string position;
    uint256 baseSalary;
    uint256 pendingReimbursement;
    bool exists;
  }

  mapping(bytes32 => Employee) public employees;

  struct Reimbursement {
    uint256 recordId;
    address employee;
    uint256 amount;
    string description;
    uint8 status;
    address approvedBy;
    uint256 approvedAt;
    uint256 timestamp;
    address treasuryAdmin;
    bool exists;
  }

  mapping(bytes32 => Reimbursement) public reimbursements;

  struct Payroll {
    uint256 recordId;
    address employee;
    uint256 amount;
    uint256 baseSalary;
    uint256 reimbursementAmount;
    uint256 timestamp;
    string memo;
    address treasuryAdmin;
    bool exists;
  }

  mapping(bytes32 => Payroll) public payrolls;

  struct TransferRecord {
    uint256 recordId;
    address sender;
    address recipient;
    uint256 amount;
    string memo;
    uint256 timestamp;
    address treasuryAdmin;
    uint8 transferType;
    bool exists;
  }

  mapping(bytes32 => TransferRecord) public transfers;

  struct Contact {
    address owner;
    address addr;
    string name;
    bool exists;
  }

  mapping(bytes32 => Contact) public contacts;

  /// @dev Contact keys per owner wallet (for enumeration; same pattern as reimbursement keys).
  mapping(address => bytes32[]) private _contactKeysByOwner;

  /// @dev Enumerate record keys per treasury for off-chain reads (aligned with Solana account scans).
  mapping(address => bytes32[]) private _reimbursementKeysByTreasury;
  mapping(address => bytes32[]) private _payrollKeysByTreasury;
  mapping(address => bytes32[]) private _transferKeysByTreasury;

  /// @dev Treasury admin addresses where `employee` is on the roster (employee may belong to many).
  mapping(address => address[]) private _treasuryAdminsForEmployee;

  mapping(address => uint256) public vaultBalance;
  mapping(address => uint256) public totalVaultBalance;

  bool public whitelistEnabled;
  mapping(address => bool) public whitelisted;

  event TreasuryCreated(
    address indexed admin,
    string name,
    address indexed token
  );
  event TreasuryClosed(address indexed admin);
  event EmployeeAdded(address indexed treasuryAdmin, address indexed employee);
  event EmployeeRemoved(address indexed treasuryAdmin, address indexed employee);
  event ReimbursementSubmitted(
    address indexed treasuryAdmin,
    address indexed employee,
    uint256 indexed recordId
  );
  event ReimbursementApproved(
    address indexed treasuryAdmin,
    address indexed employee,
    uint256 indexed recordId
  );
  event ReimbursementRejected(
    address indexed treasuryAdmin,
    address indexed employee,
    uint256 indexed recordId
  );
  event SalaryPaid(
    address indexed treasuryAdmin,
    address indexed employee,
    uint256 indexed recordId,
    uint256 amount
  );
  event TreasuryTransferOut(
    address indexed treasuryAdmin,
    address indexed recipient,
    uint256 indexed recordId,
    uint256 amount
  );
  event P2PTransfer(
    address indexed treasuryAdmin,
    address indexed sender,
    address indexed recipient,
    uint256 recordId,
    uint256 amount
  );
  event VaultDeposit(address indexed treasuryAdmin, uint256 amount);
  event UnaccountedTokensRescued(
    address indexed token,
    address indexed recipient,
    uint256 amount
  );
  event ContactAdded(address indexed owner, address indexed addr);
  event ContactRemoved(address indexed owner, address indexed addr);

  constructor(
    bool enableWhitelist,
    address[] memory initialWhitelist
  ) Ownable(msg.sender) {
    whitelistEnabled = enableWhitelist;
    uint256 n = initialWhitelist.length;
    for (uint256 i = 0; i < n; i++) {
      whitelisted[initialWhitelist[i]] = true;
    }
  }

  function createTreasury(
    string calldata name,
    address token
  ) external onlyWhitelistedAdmin {
    require(bytes(name).length <= MAX_NAME_LEN, 'NameTooLong');
    require(token != address(0), 'InvalidToken');
    Treasury storage t = treasuries[msg.sender];
    require(!t.exists, 'TreasuryExists');
    t.admin = msg.sender;
    t.name = name;
    t.token = token;
    t.exists = true;
    emit TreasuryCreated(msg.sender, name, token);
  }

  function depositToTreasury(uint256 amount) external nonReentrant {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(amount > 0, 'InvalidAmount');
    uint256 balanceBefore = IERC20(t.token).balanceOf(address(this));
    IERC20(t.token).safeTransferFrom(msg.sender, address(this), amount);
    uint256 received = IERC20(t.token).balanceOf(address(this)) - balanceBefore;
    require(received > 0, 'InvalidAmount');
    vaultBalance[msg.sender] += received;
    totalVaultBalance[t.token] += received;
    emit VaultDeposit(msg.sender, received);
  }

  function addEmployee(
    address employee,
    string calldata name,
    string calldata department,
    string calldata position,
    uint256 baseSalary
  ) external {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    require(bytes(name).length <= MAX_NAME_LEN, 'NameTooLong');
    require(bytes(department).length <= MAX_DEPARTMENT_LEN, 'DepartmentTooLong');
    require(bytes(position).length <= MAX_POSITION_LEN, 'PositionTooLong');
    bytes32 ek = employeeKey(msg.sender, employee);
    require(!employees[ek].exists, 'EmployeeAlreadyExists');
    require(t.employeeWallets.length < MAX_EMPLOYEES, 'MaxEmployeesReached');
    if (!_contains(t.employeeWallets, employee)) {
      t.employeeWallets.push(employee);
    }
    employees[ek] = Employee({
      wallet: employee,
      treasuryAdmin: msg.sender,
      name: name,
      department: department,
      position: position,
      baseSalary: baseSalary,
      pendingReimbursement: 0,
      exists: true
    });
    _addEmployeeTreasury(employee, msg.sender);
    emit EmployeeAdded(msg.sender, employee);
  }

  function removeEmployee(address employee) external {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    bytes32 ek = employeeKey(msg.sender, employee);
    require(employees[ek].exists, 'EmployeeNotFound');
    _removeWallet(t.employeeWallets, employee);
    _removeTreasuryFromList(_treasuryAdminsForEmployee[employee], msg.sender);
    delete employees[ek];
    emit EmployeeRemoved(msg.sender, employee);
  }

  function submitReimbursement(
    address treasuryAdmin,
    uint256 recordId,
    uint256 amount,
    string calldata description
  ) external {
    Treasury storage t = treasuries[treasuryAdmin];
    require(t.exists, 'NoTreasury');
    require(_contains(t.employeeWallets, msg.sender), 'EmployeeNotFound');
    require(amount > 0, 'InvalidAmount');
    require(bytes(description).length <= MAX_DESCRIPTION_LEN, 'DescriptionTooLong');
    bytes32 rk = reimbursementKey(treasuryAdmin, msg.sender, recordId);
    require(!reimbursements[rk].exists, 'RecordExists');
    reimbursements[rk] = Reimbursement({
      recordId: recordId,
      employee: msg.sender,
      amount: amount,
      description: description,
      status: REIMB_PENDING,
      approvedBy: address(0),
      approvedAt: 0,
      timestamp: block.timestamp,
      treasuryAdmin: treasuryAdmin,
      exists: true
    });
    _reimbursementKeysByTreasury[treasuryAdmin].push(rk);
    emit ReimbursementSubmitted(treasuryAdmin, msg.sender, recordId);
  }

  function approveReimbursement(address employee, uint256 recordId) external {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    bytes32 rk = reimbursementKey(msg.sender, employee, recordId);
    Reimbursement storage r = reimbursements[rk];
    require(r.exists, 'NotFound');
    require(r.status == REIMB_PENDING, 'InvalidReimbursementStatus');
    bytes32 ek = employeeKey(msg.sender, employee);
    Employee storage e = employees[ek];
    require(e.exists, 'EmployeeNotFound');
    e.pendingReimbursement += r.amount;
    r.status = REIMB_APPROVED;
    r.approvedBy = msg.sender;
    r.approvedAt = block.timestamp;
    emit ReimbursementApproved(msg.sender, employee, recordId);
  }

  function rejectReimbursement(address employee, uint256 recordId) external {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    bytes32 rk = reimbursementKey(msg.sender, employee, recordId);
    Reimbursement storage r = reimbursements[rk];
    require(r.exists, 'NotFound');
    require(r.status == REIMB_PENDING, 'InvalidReimbursementStatus');
    r.status = REIMB_REJECTED;
    r.approvedBy = msg.sender;
    r.approvedAt = block.timestamp;
    emit ReimbursementRejected(msg.sender, employee, recordId);
  }

  function paySalary(
    address employee,
    uint256 recordId,
    string calldata memo
  ) external nonReentrant {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    require(bytes(memo).length <= MAX_MEMO_LEN, 'MemoTooLong');
    require(_contains(t.employeeWallets, employee), 'EmployeeNotFound');
    bytes32 ek = employeeKey(msg.sender, employee);
    Employee storage e = employees[ek];
    require(e.exists, 'EmployeeNotFound');
    uint256 base = e.baseSalary;
    uint256 reimb = e.pendingReimbursement;
    uint256 amount = base + reimb;
    require(amount > 0, 'InvalidAmount');
    require(vaultBalance[msg.sender] >= amount, 'InsufficientFunds');
    bytes32 pk = payrollKey(msg.sender, employee, recordId);
    require(!payrolls[pk].exists, 'RecordExists');
    vaultBalance[msg.sender] -= amount;
    totalVaultBalance[t.token] -= amount;
    IERC20(t.token).safeTransfer(employee, amount);
    e.pendingReimbursement = 0;
    payrolls[pk] = Payroll({
      recordId: recordId,
      employee: employee,
      amount: amount,
      baseSalary: base,
      reimbursementAmount: reimb,
      timestamp: block.timestamp,
      memo: memo,
      treasuryAdmin: msg.sender,
      exists: true
    });
    _payrollKeysByTreasury[msg.sender].push(pk);
    emit SalaryPaid(msg.sender, employee, recordId, amount);
  }

  function transferFromTreasury(
    address recipient,
    uint256 recordId,
    uint256 amount,
    string calldata memo
  ) external nonReentrant {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    require(msg.sender == t.admin, 'Unauthorized');
    require(amount > 0, 'InvalidAmount');
    require(bytes(memo).length <= MAX_MEMO_LEN, 'MemoTooLong');
    require(vaultBalance[msg.sender] >= amount, 'InsufficientFunds');
    bytes32 tk = transferTreasuryOutKey(msg.sender, recipient, recordId);
    require(!transfers[tk].exists, 'RecordExists');
    vaultBalance[msg.sender] -= amount;
    totalVaultBalance[t.token] -= amount;
    IERC20(t.token).safeTransfer(recipient, amount);
    transfers[tk] = TransferRecord({
      recordId: recordId,
      sender: msg.sender,
      recipient: recipient,
      amount: amount,
      memo: memo,
      timestamp: block.timestamp,
      treasuryAdmin: msg.sender,
      transferType: TRANSFER_TREASURY_OUT,
      exists: true
    });
    _transferKeysByTreasury[msg.sender].push(tk);
    emit TreasuryTransferOut(msg.sender, recipient, recordId, amount);
  }

  function transferP2p(
    address treasuryAdmin,
    address recipient,
    uint256 recordId,
    uint256 amount,
    string calldata memo
  ) external nonReentrant {
    Treasury storage t = treasuries[treasuryAdmin];
    require(t.exists, 'NoTreasury');
    require(amount > 0, 'InvalidAmount');
    require(bytes(memo).length <= MAX_MEMO_LEN, 'MemoTooLong');
    require(msg.sender != recipient, 'CannotTransferToSelf');
    require(_contains(t.employeeWallets, msg.sender), 'EmployeeNotFound');
    IERC20 token = IERC20(t.token);
    token.safeTransferFrom(msg.sender, recipient, amount);
    bytes32 tk = transferP2pKey(treasuryAdmin, msg.sender, recordId);
    require(!transfers[tk].exists, 'RecordExists');
    transfers[tk] = TransferRecord({
      recordId: recordId,
      sender: msg.sender,
      recipient: recipient,
      amount: amount,
      memo: memo,
      timestamp: block.timestamp,
      treasuryAdmin: treasuryAdmin,
      transferType: TRANSFER_P2P,
      exists: true
    });
    _transferKeysByTreasury[treasuryAdmin].push(tk);
    emit P2PTransfer(treasuryAdmin, msg.sender, recipient, recordId, amount);
  }

  function addContact(address addr, string calldata name) external {
    require(addr != address(0), 'InvalidAddr');
    require(bytes(name).length <= MAX_NAME_LEN, 'NameTooLong');
    bytes32 ck = contactKey(msg.sender, addr);
    require(!contacts[ck].exists, 'ContactExists');
    contacts[ck] = Contact({
      owner: msg.sender,
      addr: addr,
      name: name,
      exists: true
    });
    _contactKeysByOwner[msg.sender].push(ck);
    emit ContactAdded(msg.sender, addr);
  }

  function removeContact(address addr) external {
    bytes32 ck = contactKey(msg.sender, addr);
    Contact storage c = contacts[ck];
    require(c.exists, 'ContactNotFound');
    require(c.owner == msg.sender, 'Unauthorized');
    delete contacts[ck];
    _removeContactKey(msg.sender, ck);
    emit ContactRemoved(msg.sender, addr);
  }

  function closeTreasury() external nonReentrant {
    Treasury storage t = treasuries[msg.sender];
    require(t.exists, 'NoTreasury');
    IERC20 token = IERC20(t.token);
    uint256 bal = vaultBalance[msg.sender];
    if (bal > 0) {
      vaultBalance[msg.sender] = 0;
      totalVaultBalance[t.token] -= bal;
      token.safeTransfer(msg.sender, bal);
    }
    uint256 len = t.employeeWallets.length;
    for (uint256 i = 0; i < len; i++) {
      address emp = t.employeeWallets[i];
      _removeTreasuryFromList(_treasuryAdminsForEmployee[emp], msg.sender);
      bytes32 ek = employeeKey(msg.sender, emp);
      delete employees[ek];
    }
    delete _reimbursementKeysByTreasury[msg.sender];
    delete _payrollKeysByTreasury[msg.sender];
    delete _transferKeysByTreasury[msg.sender];
    delete treasuries[msg.sender];
    emit TreasuryClosed(msg.sender);
  }

  /// @notice Recover ERC20 tokens sent directly to this contract without a
  /// `depositToTreasury` call. Accounted treasury balances are never touched.
  function rescueUnaccountedTokens(
    address token,
    address recipient,
    uint256 amount
  ) external onlyOwner nonReentrant {
    require(token != address(0), 'InvalidToken');
    require(recipient != address(0), 'InvalidRecipient');
    require(amount > 0, 'InvalidAmount');
    uint256 balance = IERC20(token).balanceOf(address(this));
    require(
      balance >= totalVaultBalance[token] + amount,
      'InsufficientUnaccountedTokens'
    );
    IERC20(token).safeTransfer(recipient, amount);
    emit UnaccountedTokensRescued(token, recipient, amount);
  }

  function getTreasuryFull(
    address admin
  )
    external
    view
    returns (
      address adminOut,
      string memory name,
      address[] memory employeeWallets,
      address token,
      bool exists
    )
  {
    Treasury storage tr = treasuries[admin];
    return (tr.admin, tr.name, tr.employeeWallets, tr.token, tr.exists);
  }

  function getReimbursementKeys(
    address treasuryAdmin
  ) external view returns (bytes32[] memory) {
    return _reimbursementKeysByTreasury[treasuryAdmin];
  }

  function getPayrollKeys(address treasuryAdmin) external view returns (bytes32[] memory) {
    return _payrollKeysByTreasury[treasuryAdmin];
  }

  function getTransferKeys(address treasuryAdmin) external view returns (bytes32[] memory) {
    return _transferKeysByTreasury[treasuryAdmin];
  }

  function getContactKeys(address owner) external view returns (bytes32[] memory) {
    return _contactKeysByOwner[owner];
  }

  function getTreasuryAdminsForEmployee(
    address employee
  ) external view returns (address[] memory) {
    return _treasuryAdminsForEmployee[employee];
  }

  function employeeKey(
    address treasuryAdmin,
    address employee
  ) public pure returns (bytes32) {
    return keccak256(abi.encode(treasuryAdmin, employee));
  }

  function reimbursementKey(
    address treasuryAdmin,
    address employee,
    uint256 recordId
  ) public pure returns (bytes32) {
    return
      keccak256(abi.encode('REIMBURSEMENT', treasuryAdmin, employee, recordId));
  }

  function payrollKey(
    address treasuryAdmin,
    address employee,
    uint256 recordId
  ) public pure returns (bytes32) {
    return keccak256(abi.encode('PAYROLL', treasuryAdmin, employee, recordId));
  }

  function transferTreasuryOutKey(
    address treasuryAdmin,
    address recipient,
    uint256 recordId
  ) public pure returns (bytes32) {
    return
      keccak256(abi.encode('TREASURY_OUT', treasuryAdmin, recipient, recordId));
  }

  function transferP2pKey(
    address treasuryAdmin,
    address sender,
    uint256 recordId
  ) public pure returns (bytes32) {
    return keccak256(abi.encode('P2P', treasuryAdmin, sender, recordId));
  }

  function contactKey(address owner, address addr) public pure returns (bytes32) {
    return keccak256(abi.encode(owner, addr));
  }

  modifier onlyWhitelistedAdmin() {
    if (whitelistEnabled) {
      require(whitelisted[msg.sender], 'NotWhitelistedAdmin');
    }
    _;
  }

  function _contains(address[] storage list, address a) internal view returns (bool) {
    uint256 n = list.length;
    for (uint256 i = 0; i < n; i++) {
      if (list[i] == a) return true;
    }
    return false;
  }

  function _removeWallet(address[] storage list, address a) internal {
    uint256 n = list.length;
    for (uint256 i = 0; i < n; i++) {
      if (list[i] == a) {
        list[i] = list[n - 1];
        list.pop();
        return;
      }
    }
    revert('EmployeeNotFound');
  }

  function _addEmployeeTreasury(address employee, address treasuryAdmin) private {
    address[] storage arr = _treasuryAdminsForEmployee[employee];
    if (!_contains(arr, treasuryAdmin)) {
      arr.push(treasuryAdmin);
    }
  }

  function _removeTreasuryFromList(
    address[] storage list,
    address treasuryAdmin
  ) private {
    uint256 n = list.length;
    for (uint256 i = 0; i < n; i++) {
      if (list[i] == treasuryAdmin) {
        list[i] = list[n - 1];
        list.pop();
        return;
      }
    }
  }

  function _removeContactKey(address owner, bytes32 ck) private {
    bytes32[] storage keys = _contactKeysByOwner[owner];
    uint256 n = keys.length;
    for (uint256 i = 0; i < n; i++) {
      if (keys[i] == ck) {
        keys[i] = keys[n - 1];
        keys.pop();
        return;
      }
    }
  }
}
