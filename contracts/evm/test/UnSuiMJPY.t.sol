// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;
import {UnSuiMJPY} from "../src/UnSuiMJPY.sol";

interface VmMJPY {
    function prank(address) external;
    function expectRevert(bytes4) external;
    function warp(uint256) external;
}

contract TestMJPY {
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    bool public fail;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function setFail(bool value) external {
        fail = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (fail) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract UnSuiMJPYTest {
    VmMJPY constant vm = VmMJPY(address(uint160(uint256(keccak256("hevm cheat code")))));
    TestMJPY token;
    UnSuiMJPY target;
    address payable constant USER = payable(address(0x123));

    function setUp() public {
        vm.warp(1000);
        token = new TestMJPY();
        target = new UnSuiMJPY(address(this), address(this), address(token));
        token.mint(address(target), 20000 * 1e6);
    }

    function claim() internal view returns (UnSuiMJPY.Claim memory) {
        return UnSuiMJPY.Claim(keccak256("card"), keccak256("request"), USER, 1112, 1112, 0, block.timestamp + 120);
    }

    function testYenParityFeeAndReceipt() public {
        UnSuiMJPY.Claim memory c = claim();
        target.refund(c);
        require(token.balanceOf(USER) == 1089760000, "1112 yen -> 1089.76 MJPY");
        UnSuiMJPY.Receipt memory r = target.getReceipt(c.request);
        require(r.amountAtomic == 1089760000);
        require(
            r.hash
                == keccak256(
                    abi.encode(
                        target.DOMAIN(),
                        block.chainid,
                        address(target),
                        address(token),
                        c.request,
                        c.card,
                        c.recipient,
                        r.amountJpy,
                        r.amountAtomic,
                        r.observedJpy,
                        r.redeemedJpy,
                        r.sequence,
                        r.previousHash,
                        r.timestamp
                    )
                )
        );
    }

    function testReplay() public {
        target.refund(claim());
        vm.expectRevert(UnSuiMJPY.Replay.selector);
        target.refund(claim());
    }

    function testUnauthorized() public {
        UnSuiMJPY.Claim memory c = claim();
        vm.prank(USER);
        vm.expectRevert(UnSuiMJPY.Unauthorized.selector);
        target.refund(c);
    }

    function testRejectedTokenTransferRollsBack() public {
        token.setFail(true);
        vm.expectRevert(UnSuiMJPY.TransferFailed.selector);
        target.refund(claim());
        require(target.getReceipt(claim().request).sequence == 0);
        token.setFail(false);
        target.refund(claim());
    }

    function testOverdraw() public {
        UnSuiMJPY.Claim memory c = claim();
        c.amountJpy++;
        vm.expectRevert(UnSuiMJPY.ExceedsObservedBalance.selector);
        target.refund(c);
    }

    function testPaused() public {
        target.configure(address(this), true);
        vm.expectRevert(UnSuiMJPY.Paused.selector);
        target.refund(claim());
    }

    function testExpired() public {
        UnSuiMJPY.Claim memory c = claim();
        c.expiresAt = 999;
        vm.expectRevert(UnSuiMJPY.Expired.selector);
        target.refund(c);
    }

    function testFuzzYenAmounts(uint16 raw) public {
        UnSuiMJPY.Claim memory c = claim();
        c.amountJpy = uint256(raw) % 20000 + 1;
        c.observedJpy = c.amountJpy;
        target.refund(c);
        require(token.balanceOf(USER) == c.amountJpy * 980000);
    }
}
