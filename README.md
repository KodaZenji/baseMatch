
BaseMatch – What is this?

BaseMatch is a dating mini-app designed to reduce ghosting through accountability and commitment.

You sign up with your email and connect a crypto wallet.
When two people agree on a date, both stake a small amount to show intent and seriousness.


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
> Attendee gets 150% of stake minus platform fee, ghost gets 0	

(Sweet + bitter: attendee rewarded, ghost loses stake) 

C. Both missed confirmation	
> Both refunded 90% of stake; 5% platform fee + 5% missed-confirmation fee
	
(Neutral: small sting to encourage confirmation, no major punishment)


> Tooltip :
“Staking shows commitment.

Show up → stake returned + bonus reward (150% minus platform fee)

Ghost → stake forfeited

Missed confirmation → 90% refund, small fee deducted


Ratings are only available for staked dates and highlight serious participants.”



Built on Base for fast, low-cost transactions.
No real money is used during testing.


---

How to Test BaseMatch (Base Sepolia)

Go here 👉🏾 https://basematch.app

1️⃣ Create an account with email and connect a wallet (MetaMask or any EVM wallet)

2️⃣ Switch your wallet network to Base Sepolia

3️⃣ Get Base Sepolia ETH for gas (from any Sepolia faucet)

4️⃣ Get testnet USDC

> Need test USDC for Base Sepolia?
Use Circle’s official faucet 👉 https://faucet.circle.com/
Select Base Sepolia



5️⃣ Create a profile, match, and test the app to its limits:

Match with others

Chat with your match

Delete messages

Send crypto gifts (min 1 USDC in testnet)

IRL gifting

Edit interests, profile picture, etc.


> You’re not using real money — only testnet ETH and USDC for Base Sepolia.

---

How to Deploy to Mainnet

1️⃣ Configure your environment variables for mainnet:
- Set `NEXT_PUBLIC_ENABLE_MAINNET=true`
- Set mainnet contract addresses as environment variables
- Ensure your private key has Base mainnet ETH for gas

2️⃣ Update your deployment script with mainnet USDC address:
- Base mainnet USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

3️⃣ Run the mainnet deployment:
```bash
npx hardhat run scripts/deployMainnet.js --network base-mainnet
```

4️⃣ Verify contracts on Basescan:
```bash
npx hardhat verify --network base-mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

5️⃣ Update your frontend environment variables with the deployed contract addresses

> ⚠️ IMPORTANT: All contracts use UUPS proxy pattern for upgradability. Test thoroughly before mainnet deployment!

---

BaseMatch helps serious people date seriously — ghosting has a cost, and commitment is rewarded.
