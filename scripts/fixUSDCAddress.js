const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const rpcUrl = "https://base-sepolia-rpc.publicnode.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : '0x' + process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("Fixing USDC address with account:", signer.address);

    const STAKING_PROXY_ADDRESS = "0x363702c6bd63F9BCEB32fDAFB411160Beba60601";
    const CORRECT_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

    const STAKING_ABI = [
        "function setUSDCAddress(address)"
    ];

    const stakingProxy = new ethers.Contract(STAKING_PROXY_ADDRESS, STAKING_ABI, signer);

    console.log("\n📝 Calling setUSDCAddress()...");
    const tx = await stakingProxy.setUSDCAddress(CORRECT_USDC_ADDRESS);
    console.log("⏳ Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ USDC address fixed!");
    console.log("📍 New USDC address:", CORRECT_USDC_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
