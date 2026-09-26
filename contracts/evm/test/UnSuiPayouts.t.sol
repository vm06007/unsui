// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {UnSuiPayouts} from "../src/UnSuiPayouts.sol";

interface Vm {
    function deal(address, uint256) external;
    function chainId(uint256) external;
    function prank(address) external;
    function expectRevert(bytes4) external;
    function warp(uint256) external;
}

contract RejectEther {
    receive() external payable {
        revert();
    }
}

contract Reenter {
    UnSuiPayouts public target;
    bool public blocked;

    constructor(UnSuiPayouts t) {
        target = t;
    }

    function execute(UnSuiPayouts.Claim calldata c) external {
        target.refund(c);
    }

    receive() external payable {
        UnSuiPayouts.Claim memory c = UnSuiPayouts.Claim(
            bytes32(uint256(2)), bytes32(uint256(2)), payable(address(this)), 1, 1, 0, block.timestamp + 60
        );
        try target.refund(c) {
            blocked = false;
        } catch {
            blocked = true;
        }
    }
}

contract UnSuiPayoutsTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    UnSuiPayouts target;
    uint256 constant RATE = 2_000_000_000_000;
    address payable constant RECIPIENT = payable(address(0xB));

    function setUp() public {
        vm.warp(1_000);
        target = new UnSuiPayouts(address(this), address(this), RATE);
        vm.deal(address(target), 1 ether);
    }

    function claim() internal view returns (UnSuiPayouts.Claim memory) {
        return
            UnSuiPayouts.Claim(keccak256("card"), keccak256("request"), RECIPIENT, 1000, 1500, 0, block.timestamp + 120);
    }

    function testPayoutAndLinkedReceipt() public {
        UnSuiPayouts.Claim memory c = claim();
        bytes32 first = target.refund(c);
        require(RECIPIENT.balance == 1000 * RATE * 98 / 100);
        require(address(target).balance == 1 ether - 1000 * RATE * 98 / 100);
        UnSuiPayouts.Receipt memory r = target.getReceipt(c.request);
        require(
            r.hash
                == keccak256(
                    abi.encode(
                        target.DOMAIN(),
                        block.chainid,
                        address(target),
                        c.request,
                        c.card,
                        c.recipient,
                        r.amountJpy,
                        r.amountWei,
                        r.observedJpy,
                        r.redeemedJpy,
                        r.sequence,
                        r.previousHash,
                        r.timestamp
                    )
                )
        );
        c.request = keccak256("second");
        c.amountJpy = 500;
        c.expectedSequence = 1;
        target.refund(c);
        r = target.getReceipt(c.request);
        require(r.previousHash == first && r.sequence == 2 && r.redeemedJpy == 1500);
        require(RECIPIENT.balance == 1500 * RATE * 98 / 100);
    }

    function testAwajiNativeMizuAndChainBoundReceipt() public {
        vm.chainId(6497);
        UnSuiPayouts awaji = new UnSuiPayouts(address(this), address(this), 100_000_000_000_000);
        vm.deal(address(awaji), 1 ether); // 18 decimal native MIZU on Awaji.
        UnSuiPayouts.Claim memory c = claim();
        c.amountJpy = 575;
        bytes32 hash = awaji.refund(c);
        require(RECIPIENT.balance == 0.05635 ether, "MIZU payout amount");
        require(awaji.getReceipt(c.request).amountWei == 0.05635 ether, "MIZU receipt amount");
        vm.chainId(11155111);
        // Same contract code and claim on another chain must produce a different receipt.
        UnSuiPayouts other = new UnSuiPayouts(address(this), address(this), 100_000_000_000_000);
        vm.deal(address(other), 1 ether);
        require(other.refund(c) != hash, "chain/contract receipt domain");
    }

    function testUnauthorized() public {
        UnSuiPayouts.Claim memory c = claim();
        vm.prank(address(0xC));
        vm.expectRevert(UnSuiPayouts.Unauthorized.selector);
        target.refund(c);
    }

    function testPaused() public {
        target.configure(address(this), true);
        vm.expectRevert(UnSuiPayouts.Paused.selector);
        target.refund(claim());
    }

    function testReplay() public {
        UnSuiPayouts.Claim memory c = claim();
        target.refund(c);
        vm.expectRevert(UnSuiPayouts.Replay.selector);
        target.refund(c);
    }

    function testStaleSequence() public {
        UnSuiPayouts.Claim memory c = claim();
        c.expectedSequence = 1;
        vm.expectRevert(UnSuiPayouts.StaleSequence.selector);
        target.refund(c);
    }

    function testOverdraw() public {
        UnSuiPayouts.Claim memory c = claim();
        c.amountJpy = 1501;
        vm.expectRevert(UnSuiPayouts.ExceedsObservedBalance.selector);
        target.refund(c);
    }

    function testCumulativeOverdraw() public {
        UnSuiPayouts.Claim memory c = claim();
        target.refund(c);
        c.request = keccak256("second");
        c.expectedSequence = 1;
        c.amountJpy = 501;
        vm.expectRevert(UnSuiPayouts.ExceedsObservedBalance.selector);
        target.refund(c);
    }

    function testExpired() public {
        UnSuiPayouts.Claim memory c = claim();
        c.expiresAt = block.timestamp - 1;
        vm.expectRevert(UnSuiPayouts.Expired.selector);
        target.refund(c);
    }

    function testLongExpiry() public {
        UnSuiPayouts.Claim memory c = claim();
        c.expiresAt = block.timestamp + 301;
        vm.expectRevert(UnSuiPayouts.Expired.selector);
        target.refund(c);
    }

    function testInvalidRecipient() public {
        UnSuiPayouts.Claim memory c = claim();
        c.recipient = payable(address(0));
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        target.refund(c);
    }

    function testSelfRecipient() public {
        UnSuiPayouts.Claim memory c = claim();
        c.recipient = payable(address(target));
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        target.refund(c);
    }

    function testEmptyTreasuryRollsBack() public {
        vm.deal(address(target), 0);
        vm.expectRevert(UnSuiPayouts.InsufficientTreasury.selector);
        target.refund(claim());
        require(target.getReceipt(claim().request).sequence == 0);
    }

    function testRejectedTransferRollsBackAndCanRetry() public {
        UnSuiPayouts.Claim memory c = claim();
        c.recipient = payable(address(new RejectEther()));
        vm.expectRevert(UnSuiPayouts.TransferFailed.selector);
        target.refund(c);
        require(target.getReceipt(c.request).sequence == 0);
        (uint256 redeemed, uint256 sequence, bytes32 head) = target.cards(c.card);
        require(redeemed == 0 && sequence == 0 && head == 0);
        c.recipient = RECIPIENT;
        target.refund(c);
    }

    function testReentrancyBlockedEvenForOperator() public {
        Reenter r = new Reenter(target);
        target.configure(address(r), false);
        UnSuiPayouts.Claim memory c = claim();
        c.recipient = payable(address(r));
        r.execute(c);
        require(r.blocked());
        require(address(r).balance == 1000 * RATE * 98 / 100);
    }

    function testAdminRotation() public {
        target.proposeOwner(address(0xD));
        vm.prank(address(0xC));
        vm.expectRevert(UnSuiPayouts.Unauthorized.selector);
        target.acceptOwnership();
        vm.prank(address(0xD));
        target.acceptOwnership();
        vm.expectRevert(UnSuiPayouts.Unauthorized.selector);
        target.configure(address(this), true);
    }

    function testOperatorRotation() public {
        target.configure(address(0xD), false);
        vm.expectRevert(UnSuiPayouts.Unauthorized.selector);
        target.refund(claim());
        UnSuiPayouts.Claim memory c = claim();
        vm.prank(address(0xD));
        target.refund(c);
    }

    function testZeroAmount() public {
        UnSuiPayouts.Claim memory c = claim();
        c.amountJpy = 0;
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        target.refund(c);
    }

    function testZeroRequest() public {
        UnSuiPayouts.Claim memory c = claim();
        c.request = bytes32(0);
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        target.refund(c);
    }

    function testObservationLimit() public {
        UnSuiPayouts.Claim memory c = claim();
        c.observedJpy = 20001;
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        target.refund(c);
    }

    function testUnauthorizedConfiguration() public {
        vm.prank(address(0xC));
        vm.expectRevert(UnSuiPayouts.Unauthorized.selector);
        target.configure(address(0xC), false);
    }

    function testResumeAfterPause() public {
        target.configure(address(this), true);
        target.configure(address(this), false);
        target.refund(claim());
    }

    function testInvalidRate() public {
        vm.expectRevert(UnSuiPayouts.InvalidClaim.selector);
        new UnSuiPayouts(address(this), address(this), 0);
    }

    function testDeposit() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(target).call{value: 0.1 ether}("");
        require(ok);
        require(address(target).balance == 1.1 ether);
    }

    function testFuzzPayout(uint16 raw) public {
        uint256 amount = uint256(raw) % 20000 + 1;
        UnSuiPayouts.Claim memory c = claim();
        c.amountJpy = amount;
        c.observedJpy = amount;
        target.refund(c);
        require(RECIPIENT.balance == amount * RATE * 98 / 100);
        require(target.getReceipt(c.request).redeemedJpy == amount);
    }
}
