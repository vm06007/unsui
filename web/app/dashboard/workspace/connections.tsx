import { ArrowDownLeft, ArrowRight, Radio, RefreshCw } from 'lucide-react';
import { Badge } from './badge';
import type { Feed } from './types';

export function ConnectionsPanel({
    view,
    connection,
    feed,
    lastSync,
    manualRefresh,
    setSource,
    navigate,
}: {
    view: string;
    connection: string;
    feed: Feed;
    lastSync: Date | null;
    manualRefresh: () => void;
    setSource: (source: string) => void;
    navigate: (next: string) => void;
}) {
    return (
        <>
            {view === 'connections' && (
                <div className="connections-grid">
                    <section className="card integration">
                        <span className="integration-icon">
                            <Radio />
                        </span>
                        <Badge value={connection} />
                        <h2>UnSui app ledger</h2>
                        <p>
                            Confirmed receipts from the mobile backend. Polling every
                            five seconds via a local, read-only operations endpoint.
                        </p>
                        <dl>
                            <dt>Records received</dt>
                            <dd>{feed.records.length}</dd>
                            <dt>Last successful sync</dt>
                            <dd>{lastSync?.toLocaleTimeString() || 'Not yet'}</dd>
                            <dt>Scope</dt>
                            <dd>Amounts, recipients, hashes, receipt IDs</dd>
                        </dl>
                        <button className="secondary" onClick={manualRefresh}>
                            Sync now <RefreshCw size={14} />
                        </button>
                    </section>
                    <section className="card integration">
                        <span className="integration-icon blue">
                            <ArrowDownLeft />
                        </span>
                        <Badge value="sandbox" />
                        <h2>SB merchant data</h2>
                        <p>
                            The 18 service purchases are a sample merchant dataset. A
                            future server-side SB API adapter will attach settlement and
                            payment references to these orders.
                        </p>
                        <dl>
                            <dt>Live API</dt>
                            <dd>Not connected</dd>
                            <dt>Matching key</dt>
                            <dd>Merchant order reference</dd>
                            <dt>API credentials</dt>
                            <dd>None stored in this dashboard</dd>
                        </dl>
                        <button
                            className="secondary"
                            onClick={() => {
                                setSource('sandbox');
                                navigate('orders');
                            }}
                        >
                            Inspect sandbox orders <ArrowRight size={14} />
                        </button>
                    </section>
                    <section className="card wide">
                        <h2>What each system knows</h2>
                        <div className="responsibilities">
                            <div>
                                <b>Merchant processor</b>
                                <p>
                                    Purchase amount, merchant order ID, payment result
                                    and yen settlement.
                                </p>
                            </div>
                            <div>
                                <b>UnSui</b>
                                <p>
                                    Refund order, recipient wallet, chain, payout amount
                                    and receipt proof.
                                </p>
                            </div>
                            <div>
                                <b>This workspace</b>
                                <p>
                                    Joins references, highlights missing matches and
                                    projects buffer demand. It never signs transactions.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
