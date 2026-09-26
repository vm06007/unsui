/// UnSui treasury and append-only refund receipts. The operator attests to the
/// scan; this contract does not authenticate NFC data or debit a transit card.
module unsui::refunds;

use std::bcs;
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use std::hash;
use sui::sui::SUI;
use sui::table::{Self, Table};

const EUnauthorized: u64 = 0;
const EInvalid: u64 = 1;
const EReplay: u64 = 2;
const EBalance: u64 = 3;
const ESequence: u64 = 4;
const EExpired: u64 = 5;
const EPaused: u64 = 6;
const MIST_PER_JPY: u64 = 100000;
const FEE_BPS: u64 = 200;
const BPS: u64 = 10000;

public struct AdminCap has key, store { id: UID, ledger: ID }
public struct Ledger has key {
    id: UID,
    operator: address,
    paused: bool,
    pool: Balance<SUI>,
    cards: Table<vector<u8>, CardState>,
    requests: Table<vector<u8>, ID>,
}
public struct CardState has store, copy, drop {
    redeemed_jpy: u64,
    sequence: u64,
    head: vector<u8>,
    latest: address,
}
/// BCS-encoded in this exact field order, then SHA-256 hashed.
public struct ReceiptData has store, copy, drop {
    domain: vector<u8>,
    ledger: ID,
    card: vector<u8>,
    request: vector<u8>,
    recipient: address,
    amount_jpy: u64,
    amount_mist: u64,
    observed_jpy: u64,
    redeemed_jpy: u64,
    sequence: u64,
    previous_receipt: address,
    previous_hash: vector<u8>,
    claim_root: vector<u8>,
    timestamp_ms: u64,
}
public struct Receipt has key { id: UID, data: ReceiptData, hash: vector<u8> }
public struct Refunded has copy, drop {
    receipt: ID, card: vector<u8>, sequence: u64, hash: vector<u8>,
}

fun init(ctx: &mut TxContext) {
    let ledger = Ledger {
        id: object::new(ctx), operator: ctx.sender(), paused: false,
        pool: balance::zero(), cards: table::new(ctx), requests: table::new(ctx),
    };
    let cap = AdminCap { id: object::new(ctx), ledger: object::id(&ledger) };
    transfer::transfer(cap, ctx.sender());
    transfer::share_object(ledger);
}

public fun deposit(ledger: &mut Ledger, funds: Coin<SUI>) {
    ledger.pool.join(coin::into_balance(funds));
}
public fun configure(cap: &AdminCap, ledger: &mut Ledger, operator: address, paused: bool) {
    assert!(cap.ledger == object::id(ledger), EUnauthorized);
    ledger.operator = operator;
    ledger.paused = paused;
}

/// Domain-separated Merkle leaves: card commitment, recipient, yen amount,
/// observed scan balance. Allows field inclusion proofs without scan history.
public fun leaf(bytes: vector<u8>): vector<u8> {
    let mut input = vector[0u8];
    input.append(bytes);
    hash::sha2_256(input)
}
public fun node(left: vector<u8>, right: vector<u8>): vector<u8> {
    let mut input = vector[1u8];
    input.append(left);
    input.append(right);
    hash::sha2_256(input)
}
public fun claim_root(card: vector<u8>, recipient: address, amount: u64, observed: u64): vector<u8> {
    node(
        node(leaf(bcs::to_bytes(&card)), leaf(bcs::to_bytes(&recipient))),
        node(leaf(bcs::to_bytes(&amount)), leaf(bcs::to_bytes(&observed))),
    )
}

public fun refund(
    ledger: &mut Ledger, card: vector<u8>, request: vector<u8>,
    recipient: address, amount_jpy: u64, observed_jpy: u64,
    expected_sequence: u64, expires_ms: u64, clock: &Clock, ctx: &mut TxContext,
) {
    assert!(ctx.sender() == ledger.operator, EUnauthorized);
    assert!(!ledger.paused, EPaused);
    assert!(card.length() == 32 && request.length() == 32 && amount_jpy > 0, EInvalid);
    // A bounded hackathon treasury policy, not a fiat conversion oracle.
    assert!(observed_jpy <= 20000 && recipient != @0x0, EInvalid);
    let now = clock::timestamp_ms(clock);
    assert!(now <= expires_ms && expires_ms - now <= 300000, EExpired);
    assert!(!ledger.requests.contains(request), EReplay);
    if (!ledger.cards.contains(card)) {
        ledger.cards.add(card, CardState { redeemed_jpy: 0, sequence: 0, head: vector[], latest: @0x0 });
    };
    let ledger_id = object::id(ledger);
    let state = ledger.cards.borrow_mut(card);
    assert!(expected_sequence == state.sequence, ESequence);
    assert!(state.redeemed_jpy <= observed_jpy && amount_jpy <= observed_jpy - state.redeemed_jpy, EBalance);
    let amount_mist = amount_jpy * MIST_PER_JPY * (BPS - FEE_BPS) / BPS;
    let data = ReceiptData {
        domain: b"UNSUI_RECEIPT_V2", ledger: ledger_id,
        card, request, recipient, amount_jpy, amount_mist, observed_jpy,
        redeemed_jpy: state.redeemed_jpy + amount_jpy,
        sequence: state.sequence + 1, previous_receipt: state.latest,
        previous_hash: state.head, claim_root: claim_root(card, recipient, amount_jpy, observed_jpy),
        timestamp_ms: now,
    };
    let digest = hash::sha2_256(bcs::to_bytes(&data));
    let receipt = Receipt { id: object::new(ctx), data, hash: digest };
    let receipt_id = object::id(&receipt);
    state.redeemed_jpy = data.redeemed_jpy;
    state.sequence = data.sequence;
    state.head = digest;
    state.latest = object::id_address(&receipt);
    ledger.requests.add(request, receipt_id);
    let payout = coin::from_balance(ledger.pool.split(amount_mist), ctx);
    transfer::public_transfer(payout, recipient);
    event::emit(Refunded { receipt: receipt_id, card, sequence: data.sequence, hash: digest });
    transfer::freeze_object(receipt);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }

#[test_only]
fun exercise(sender: address, amount: u64, sequence: u64, repeat: bool, expiry: u64, paused: bool) {
    use sui::test_scenario as ts;
    let mut s = ts::begin(@0xA);
    init(s.ctx());
    s.next_tx(@0xA);
    {
        let mut ledger = s.take_shared<Ledger>();
        deposit(&mut ledger, coin::mint_for_testing<SUI>(2000000000, s.ctx()));
        ledger.paused = paused;
        ts::return_shared(ledger);
    };
    s.next_tx(sender);
    {
        let mut ledger = s.take_shared<Ledger>();
        let clock = clock::create_for_testing(s.ctx());
        let card = hash::sha2_256(b"card");
        let request = hash::sha2_256(b"request");
        refund(&mut ledger, card, request, @0xB, amount, 1500, sequence, expiry, &clock, s.ctx());
        if (repeat) refund(&mut ledger, card, request, @0xB, 1, 1500, 1, expiry, &clock, s.ctx());
        let state = ledger.cards.borrow(card);
        assert!(state.redeemed_jpy == amount && state.sequence == 1);
        assert!(ledger.pool.value() == 2000000000 - amount * MIST_PER_JPY * (BPS - FEE_BPS) / BPS);
        clock::destroy_for_testing(clock);
        ts::return_shared(ledger);
    };
    s.next_tx(@0xB);
    {
        let coin = s.take_from_sender<Coin<SUI>>();
        assert!(coin.value() == amount * MIST_PER_JPY * (BPS - FEE_BPS) / BPS);
        coin::burn_for_testing(coin);
    };
    s.end();
}
#[test]
fun payout_and_record_are_atomic() { exercise(@0xA, 1500, 0, false, 1000, false) }
#[test, expected_failure(abort_code = EUnauthorized)]
fun rejects_unauthorized() { exercise(@0xC, 1500, 0, false, 1000, false) }
#[test, expected_failure(abort_code = EBalance)]
fun rejects_overspend() { exercise(@0xA, 1501, 0, false, 1000, false) }
#[test, expected_failure(abort_code = EReplay)]
fun rejects_replay() { exercise(@0xA, 1000, 0, true, 1000, false) }
#[test, expected_failure(abort_code = ESequence)]
fun rejects_stale_sequence() { exercise(@0xA, 1500, 1, false, 1000, false) }
#[test, expected_failure(abort_code = EExpired)]
fun rejects_long_lived_claim() { exercise(@0xA, 1500, 0, false, 300001, false) }
#[test, expected_failure(abort_code = EPaused)]
fun rejects_paused() { exercise(@0xA, 1500, 0, false, 1000, true) }

#[test]
fun small_payout_keeps_fractional_yen_fee() { exercise(@0xA, 123, 0, false, 1000, false) }
