const hre = require("hardhat");
const { upgrades } = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Final fix: Redeploy Staking with correct USDC...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Since we can't easily re-init the proxy, let's deploy a fresh one
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Correct USDC
    const STAKING_PROXY_ADDRESS = "0x363702c6bd63F9BCEB32fDAFB411160Beba60601";

    const Staking = await ethers.getContractFactory("Staking");

    console.log("Upgrading proxy with CORRECT USDC initialization...");

    // This will upgrade the implementation AND call initialize with correct USDC
    const upgraded = await upgrades.upgradeProxy(STAKING_PROXY_ADDRESS, Staking, {
        kind: "uups",
        call: { fn: 'initialize', args: [USDC_ADDRESS] }
    });

    console.log("✅ Staking proxy upgraded with correct USDC!");
    console.log("📍 Proxy address:", STAKING_PROXY_ADDRESS);
    console.log("💰 USDC address:", USDC_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
