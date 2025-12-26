export const CONTRACT_TEMPLATES = {
  salary: {
    content: `
            <h2 style="text-align: center;">EMPLOYMENT AGREEMENT</h2>
            <p><strong>Date:</strong> {{DATE}}</p>
            <p><strong>Employer:</strong> {{EMPLOYER_WALLET}}</p>
            <p><strong>Employee:</strong> {{EMPLOYEE_WALLET}}</p>
            <hr>
            <h3>1. COMPENSATION PACKAGE</h3>
            <ul>
                <li><strong>Annual Base Salary:</strong> {{BASE_SALARY}} USD</li>
                <li><strong>One-time Joining Bonus:</strong> {{JOINING_BONUS}} USD</li>
            </ul>
            
            <h3>2. DEDUCTIONS</h3>
            <p>The standard tax/deduction rate applicable to this contract is <strong>{{TAX_RATE}}%</strong>.</p>

            <h3>3. GROWTH</h3>
            <p>The Employee is eligible for an annual increment of <strong>{{INCREMENT_RATE}}%</strong> on the Base Salary.</p>

            <h3>4. PRIVACY CLAUSE</h3>
            <p>All financial figures above are encrypted on-chain. Only the Employer and Employee can view the decrypted Net values.</p>
        `,
    ca: "0x972aaF2a66c6f8aF55e61F97C84d2C142704c3D9",
  },
  ffp: {content:`    <header style="text-align: center; border-bottom: 2px solid #2B2424; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="font-size: 24pt; margin: 0; color: #2B2424;">FIXED FEE SERVICE AGREEMENT</h1>
        <p style="font-size: 10pt; color: #6B6B6B; text-transform: uppercase; letter-spacing: 1px;">Cryptographically Secured via Contracks FHEVM</p>
    </header>

    <section>
        <h2 style="font-size: 14pt; border-bottom: 1px solid #EEE; padding-bottom: 5px;">1. PARTIES</h2>
        <p>This Agreement is entered into between:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #F0EEE9; background: #FDFBF7;">
                    <strong>CLIENT (EMPLOYER)</strong><br>
                    <span style="font-family: monospace; font-size: 10pt;">{{CLIENT_WALLET}}</span>
                </td>
                <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #F0EEE9; background: #FDFBF7;">
                    <strong>VENDOR (EMPLOYEE)</strong><br>
                    <span style="font-family: monospace; font-size: 10pt;">{{VENDOR_WALLET}}</span>
                </td>
            </tr>
        </table>
    </section>

    <section style="margin-top: 25px;">
        <h2 style="font-size: 14pt; border-bottom: 1px solid #EEE; padding-bottom: 5px;">2. SCOPE OF SERVICES</h2>
        <p>The Vendor agrees to perform the services described in the <strong>Project Registry</strong>. The total fixed budget for this engagement is cryptographically locked at:</p>
        <div style="background: #2B2424; color: #E89134; padding: 20px; text-align: center; border-radius: 8px; margin: 15px 0;">
            <span style="font-size: 10pt; color: #FFF; display: block; text-transform: uppercase;">Total Encrypted Budget</span>
            <span style="font-size: 22pt; font-weight: bold;">{{TOTAL_BUDGET}}</span>
        </div>
    </section>

    <section style="margin-top: 25px;">
        <h2 style="font-size: 14pt; border-bottom: 1px solid #EEE; padding-bottom: 5px;">3. MILESTONE & PENALTY STRUCTURE</h2>
        <p>Payment is strictly contingent upon the Client's approval of completed milestones. Late deliveries beyond the registered <strong>Deadline</strong> are subject to the following automated on-chain penalty:</p>
        <ul style="line-height: 1.8;">
            <li><strong>Penalty Rate:</strong> Variable per milestone (refer to Registry Panel).</li>
            <li><strong>Calculation Logic:</strong> $Amount = Amount - (Amount \times Penalty\%)$</li>
            <li><strong>Execution:</strong> Penalties are calculated at the discretion of the Client upon deadline breach.</li>
        </ul>
    </section>

    <section style="margin-top: 25px;">
        <h2 style="font-size: 14pt; border-bottom: 1px solid #EEE; padding-bottom: 5px;">4. CONFIDENTIALITY & FHE PROTECTION</h2>
        <p>All financial terms, including individual milestone amounts and penalty percentages, are protected by <strong>Fully Homomorphic Encryption (FHE)</strong>. Data is never decrypted on-chain; re-encryption is authorized only for the signatures listed in Section 1.</p>
    </section>

    <footer style="margin-top: 50px; border-top: 1px solid #EEE; padding-top: 20px;">
        <table style="width: 100%;">
            <tr>
                <td style="width: 50%;">
                    <div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 5px;"></div>
                    <span style="font-size: 9pt; color: #888;">Client Digital Signature</span>
                </td>
                <td style="width: 50%;">
                    <div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 5px;">
                    </div>
                    <span style="font-size: 9pt; color: #888;">Vendor Digital Signature</span>
                </td>
            </tr>
        </table>
    </footer>
        `,
        ca:"0x9a2A85D0815F2cB88df73942249DEc1691dE3b4d"
  },
  performance: {
    content: `
   <div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #000; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #fff; border: 1px solid #eee;">
    
    <h1 style="text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
        Confidential Performance Agreement
    </h1>

    <p style="text-align: center; font-style: italic; margin-bottom: 40px;">
        This agreement relies on Homomorphic Encryption (FHE) for secure, trustless execution.
    </p>

    <h3 style="text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px;">1. The Parties</h3>
    <p>
        This Performance Agreement (the "Agreement") is entered into by and between 
        <strong>The Employer</strong> (Wallet: <span style="font-family: monospace;">{{EMPLOYER_WALLET}}</span>) 
        and 
        <strong>The Employee</strong> (Wallet: <span style="font-family: monospace;">{{EMPLOYEE_WALLET}}</span>).
    </p>

    <h3 style="text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">2. Objective</h3>
    <p>
        The Employer engages the Employee to perform specific duties. To incentivize high performance, 
        the Employer agrees to pay a contingent bonus based on the confidential metrics defined below.
    </p>

    <h3 style="text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; background-color: #f3f4f6; padding: 10px;">
        3. Confidential Performance Metrics
    </h3>
    <p>
        The payment of the Bonus is strictly conditional upon the Employee achieving the following encrypted target:
    </p>
    
    <div style="border: 2px solid #000; padding: 20px; margin: 20px 0; background-color: #fff;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 10px; font-weight: bold; width: 40%;">Performance Metric:</td>
                <td style="padding: 10px;">Sales Units / Total Output</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold; border-top: 1px solid #eee;">Target Threshold:</td>
                <td style="padding: 10px; border-top: 1px solid #eee; font-family: monospace; font-size: 1.2em; color: #111;">
                    {{TARGET}} Units
                </td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold; border-top: 1px solid #eee;">Bonus Amount:</td>
                <td style="padding: 10px; border-top: 1px solid #eee; font-family: monospace; font-size: 1.2em; color: #10B981;">
                    {{BONUS}}
                </td>
            </tr>
        </table>
    </div>

    <h3 style="text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">
        4. Deadline & Submission
    </h3>
    <p>
        The Employee must submit their actual performance data to the blockchain registry on or before:
        <br>
        <strong style="font-size: 1.1em; color: #DC2626;">{{DEADLINE_DATE}} (UTC)</strong>
    </p>
    <p style="font-size: 0.9em; background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 10px;">
        <strong>Strict Enforcement:</strong> Per the Smart Contract logic, any attempt to submit performance data or sign this agreement after the timestamp <code class="unix-deadline"></code> will be automatically rejected by the network.
    </p>

    <h3 style="text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">5. Finalization & Payout</h3>
    <p>
        Final payout is calculated automatically via the <code>calculatePayout()</code> function. For the bonus to be released, two conditions must be met:
        <ol>
            <li><strong>Encrypted Verification:</strong> Actual Performance must be greater than or equal to the Target Threshold.</li>
            <li><strong>Employer Satisfaction:</strong> The Employer must submit an encrypted "Satisfied" boolean to the contract.</li>
        </ol>
    </p>

    <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
            <p><strong>Signed by Employer:</strong></p>
            <p style="font-family: monospace; font-size: 0.8em; color: #666;">(Digital Signature via Wallet)</p>
        </div>
        <div style="width: 45%; border-top: 1px solid #000; padding-top: 10px;">
            <p><strong>Signed by Employee:</strong></p>
            <p style="font-family: monospace; font-size: 0.8em; color: #666;">(Digital Signature via Wallet)</p>
        </div>
    </div>
</div>`,
    ca: "0x4DB27d657d7F705F26C05A16dE97e575689D53cD",
  },
  voting:{
    content:`<h2 style="text-align: center;"><strong>BOARD RESOLUTION &amp; VOTING RECORD</strong></h2>
<p style="text-align: center;"><em>Secured &amp; Encrypted via Zama FHEVM</em></p>
<hr />

<h3><strong>1. SESSION DETAILS</strong></h3>
<p><strong>Admin / Chairperson:</strong> {{ADMIN_WALLET}}</p>
<p><strong>Contract Reference (CID):</strong> {{IPFS_CID}}</p>
<p><strong>Voting Deadline:</strong> {{DEADLINE}}</p>
<p><strong>Total Voting Weight:</strong> {{TOTAL_WEIGHT}}</p>

<h3><strong>2. THE RESOLUTION</strong></h3>
<p>The Board is requested to vote on the following matter:</p>
<div style="background-color: #f8f9fa; border-left: 4px solid #E89134; padding: 15px; margin: 10px 0;">
    <p><em>[<strong>INSTRUCTION:</strong> Delete this text and describe the proposal here. Example: "To approve the allocation of 50,000 USDC for the Q3 Marketing Budget as detailed in the attached PDF..."]</em></p>
</div>

<h3><strong>3. VOTING MECHANISM</strong></h3>
<ul>
    <li><strong>Weighted Voting:</strong> Votes are weighted according to the share/token holdings defined in the contract whitelist.</li>
    <li><strong>Privacy:</strong> Individual votes (Yes/No) are encrypted using Fully Homomorphic Encryption (FHE). No observer, including the Admin, can see an individual member's vote while the session is active.</li>
    <li><strong>Finalization:</strong> The final tally is computed on-chain without ever revealing individual choices, unless explicitly required by the protocol.</li>
</ul>

<h3><strong>4. EXECUTION</strong></h3>
<p>By casting a vote via the associated smart contract, the Board Member authenticates their identity and agrees that their cryptographic signature constitutes a binding vote on this resolution.</p>

<p style="margin-top: 40px; font-size: 0.8em; color: #666;">
    * This document is stored on IPFS and its integrity is verified by the Ethereum Sepolia network. <br>
    * Generated by <strong>Contracks</strong>.
</p>`,
ca:"0x093Ce64c121d51FC03d71C25B715E7C1E4374C53"
  }
};
