'use client';

export function DemoExplainer() {
    return (
        <section className="demo-explainer" aria-label="About this demo">
            <div className="demo-intro">
                <span className="eyebrow">THE INTERACTIVE EXPERIENCE</span>
                <h1>
                    A small balance.
                    <br />A whole new
                    <br />
                    <em>possibility.</em>
                </h1>
                <p>
                    Your sample Suica is loaded and ready. Explore your journey, scan
                    your card and try a refund.
                </p>
                <ol>
                    <li>
                        <span>01</span>Get to know your card
                    </li>
                    <li>
                        <span>02</span>Scan to confirm a refund
                    </li>
                    <li>
                        <span>03</span>Check your receipt’s proof
                    </li>
                </ol>
                <div className="demo-boundary">
                    <span>BROWSER DEMO</span>
                    <p>
                        Sample data. No wallet connection or funds move here. The native
                        prototype uses NFC and Sui devnet.
                    </p>
                </div>
            </div>
        </section>
    );
}
