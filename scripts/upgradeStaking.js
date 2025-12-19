const hre = require("hardhat");
const { upgrades } = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Upgrading Staking contract...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Upgrading with account:", deployer.address);

    // Current proxy address (from your deployment)
    const STAKING_PROXY_ADDRESS = "0x363702c6bd63F9BCEB32fDAFB411160Beba60601";

    console.log("📝 Current Staking proxy:", STAKING_PROXY_ADDRESS);
    console.log("⏳ Upgrading to new implementation...\n");

    const Staking = await ethers.getContractFactory("Staking");

    // Upgrade the proxy - this will deploy new implementation and upgrade
    const upgraded = await upgrades.upgradeProxy(STAKING_PROXY_ADDRESS, Staking);

    console.log("✅ Staking proxy upgraded successfully!");
    console.log("📍 Proxy address (unchanged):", STAKING_PROXY_ADDRESS);
    console.log("\n🎉 All stake data has been preserved!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
