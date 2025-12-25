
BaseMatch is a dating mini-app designed to reduce ghosting through accountability and commitment.

You sign up with your email and connect a crypto wallet/ OR with your wallet and then you verify email later 

Important: Only accounts with email and wallet verified show in discovery page 

The Flow: 

When two people Match , a mutual chat window is dedidcated to them. 
All chats are encyted using almost military grade encryption so only you and your match can read your messages

Agree on a date, both stake an optipnal small amount to show intent and seriousness.


---

Staking & Rating

Staking signals commitment.
Dates that stake are more likely to show up, and serious participants are rewarded.

Ratings are only available for staked dates and help build a more accountable community.

Outcomes

Scenarios

 A. Both confirmed
 > Each gets stake back minus 5% platform fee	

(Neutral + sweet: fair and predictable)

B. One confirmed, other ghosted	
> Attendee gets 150% of stake minus platform fee, ghost gets 20% 
yeah we know! LIFE happens 	

(Sweet + bitter: attendee rewarded, ghost gets compasionate refund) 

C. Both missed confirmation	
> Both refunded 90% of stake; 5% platform fee + 5% missed-confirmation fee
	
(Neutral: small sting to encourage confirmation, no major punishment)


> Tooltip :
“Staking shows commitment.

Show up → stake returned + bonus reward (150% minus platform fee)

Ghost → 20% REFUND

Missed confirmation → 90% refund, small fee deducted


Ratings are only available for staked dates and highlight serious participants.”


Built on Base for fast, low-cost transactions.


---

How to CREATE an account

Go here 👉🏾 https://basematch.app

1️⃣ Create an account with email or connect a wallet (MetaMask or any EVM wallet)

2️⃣ Switch your wallet network to Base Mainnet

3️⃣ Create a profile, match, and test the app to its limits:

Match with others

Chat with your match

Delete messages

Send crypto gifts (min 1 USDC )

IRL gifting coming soon

Edit interests, profile picture, etc.

> ⚠️ IMPORTANT: All contracts use UUPS proxy pattern for upgradability. 
 Before an upgrade , contract creator call upgrade function and this is visible on the blockchain for all to verify 

### How It Works

1. **Propose Upgrade** (Immediate)
   ```
   Owner calls: proposeUpgrade(targetContract, newImplementation)
   Returns: proposalId
   ```

2. **Wait Period** (48 Hours)
   - Users and community can monitor the proposal
   - Anyone can check: `getTimeUntilReady(proposalId)`
   - Owner can cancel at any time: `cancelUpgrade(proposalId)`

3. **Execute Upgrade** (After 48 Hours)
   - Only owner can execute
   - Must be called via the proxy's `upgradeToAndCall()` or similar

### Contract Location
- **File**: `contracts/TimelockUpgradeController.sol`

### Key Functions

```solidity
// Propose an upgrade (48-hour delay starts)
bytes32 proposalId = timelock.proposeUpgrade(proxyAddress, newImplementation);

// Check if ready to execute
bool ready = timelock.isUpgradeReady(proposalId);

// Check time remaining
uint256 secondsLeft = timelock.getTimeUntilReady(proposalId);

// Cancel if needed
timelock.cancelUpgrade(proposalId);

// View proposal details
(target, impl, eta, executed, cancelled) = timelock.getProposal(proposalId);
```

 Safe and protected from spontaneous or off the bat upgrades

BaseMatch helps serious people date seriously — ghosting has a cost, and commitment is rewarded.
