// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Operator-attested, prefunded native EVM token payouts (ETH or MIZU) with linked receipts.
/// @dev Does not authenticate NFC scans, debit transit cards, or coordinate other chains.
contract UnSuiPayouts {
    error Unauthorized();
    error InvalidClaim();
    error Expired();
    error Paused();
    error Replay();
    error StaleSequence();
    error ExceedsObservedBalance();
    error InsufficientTreasury();
    error TransferFailed();
    error Reentrancy();

    struct CardState {
        uint256 redeemedJpy;
        uint256 sequence;
        bytes32 head;
    }

    struct Claim {
        bytes32 card;
        bytes32 request;
        address payable recipient;
        uint256 amountJpy;
        uint256 observedJpy;
        uint256 expectedSequence;
        uint256 expiresAt;
    }

    struct Receipt {
        bytes32 card;
        address recipient;
        uint256 amountJpy;
        uint256 amountWei;
        uint256 observedJpy;
        uint256 redeemedJpy;
        uint256 sequence;
        bytes32 previousHash;
        uint256 timestamp;
        bytes32 hash;
    }

    bytes32 public constant DOMAIN = keccak256("UNSUI_EVM_RECEIPT_V2");
    uint256 public constant MAX_OBSERVED_JPY = 20_000;
    uint256 public constant MAX_CLAIM_LIFETIME = 5 minutes;
    // Fixed gross conversion rate; payouts retain the 2% service fee.
    uint256 public constant FEE_BPS = 200;
    uint256 public immutable weiPerJpy;
    address public owner;
    address public pendingOwner;
    address public operator;
    bool public paused;
    bool private entered;
    mapping(bytes32 => CardState) public cards;
    mapping(bytes32 => Receipt) public receipts;

    event Funded(address indexed sender, uint256 amountWei);
    event Configured(address indexed operator, bool paused);
    event OwnershipProposed(address indexed nextOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Refunded(
        bytes32 indexed request,
        bytes32 indexed card,
        address indexed recipient,
        uint256 amountJpy,
        uint256 amountWei,
        uint256 sequence,
        bytes32 receiptHash
    );

    constructor(address admin, address payoutOperator, uint256 rateWeiPerJpy) {
        if (admin == address(0) || payoutOperator == address(0) || rateWeiPerJpy == 0 || rateWeiPerJpy > 1 ether) {
            revert InvalidClaim();
        }
        owner = admin;
        operator = payoutOperator;
        weiPerJpy = rateWeiPerJpy;
    }
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    modifier nonReentrant() {
        if (entered) revert Reentrancy();
        entered = true;
        _;
        entered = false;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function configure(address nextOperator, bool isPaused) external onlyOwner {
        if (nextOperator == address(0)) revert InvalidClaim();
        operator = nextOperator;
        paused = isPaused;
        emit Configured(nextOperator, isPaused);
    }

    function proposeOwner(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert InvalidClaim();
        pendingOwner = nextOwner;
        emit OwnershipProposed(nextOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    function refund(Claim calldata claim) external nonReentrant returns (bytes32 receiptHash) {
        if (msg.sender != operator) revert Unauthorized();
        if (paused) revert Paused();
        if (
            claim.card == bytes32(0) || claim.request == bytes32(0) || claim.recipient == address(0)
                || claim.recipient == address(this) || claim.amountJpy == 0 || claim.observedJpy > MAX_OBSERVED_JPY
        ) revert InvalidClaim();
        if (claim.expiresAt < block.timestamp || claim.expiresAt - block.timestamp > MAX_CLAIM_LIFETIME) {
            revert Expired();
        }
        if (receipts[claim.request].sequence != 0) revert Replay();
        CardState storage state = cards[claim.card];
        if (claim.expectedSequence != state.sequence) revert StaleSequence();
        if (state.redeemedJpy > claim.observedJpy || claim.amountJpy > claim.observedJpy - state.redeemedJpy) {
            revert ExceedsObservedBalance();
        }
        uint256 amountWei = claim.amountJpy * weiPerJpy * (10_000 - FEE_BPS) / 10_000;
        if (address(this).balance < amountWei) revert InsufficientTreasury();
        Receipt memory receipt = Receipt(
            claim.card,
            claim.recipient,
            claim.amountJpy,
            amountWei,
            claim.observedJpy,
            state.redeemedJpy + claim.amountJpy,
            state.sequence + 1,
            state.head,
            block.timestamp,
            bytes32(0)
        );
        receiptHash = keccak256(
            abi.encode(
                DOMAIN,
                block.chainid,
                address(this),
                claim.request,
                receipt.card,
                receipt.recipient,
                receipt.amountJpy,
                receipt.amountWei,
                receipt.observedJpy,
                receipt.redeemedJpy,
                receipt.sequence,
                receipt.previousHash,
                receipt.timestamp
            )
        );
        receipt.hash = receiptHash;
        receipts[claim.request] = receipt;
        state.redeemedJpy = receipt.redeemedJpy;
        state.sequence = receipt.sequence;
        state.head = receiptHash;
        // All state is committed before external code runs; a failed transfer rolls it all back.
        (bool success,) = claim.recipient.call{value: amountWei}("");
        if (!success) revert TransferFailed();
        emit Refunded(
            claim.request, claim.card, claim.recipient, claim.amountJpy, amountWei, receipt.sequence, receiptHash
        );
    }

    function getReceipt(bytes32 request) external view returns (Receipt memory) {
        return receipts[request];
    }
}
