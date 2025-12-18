const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying TimelockUpgradeController on Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Deploying TimelockUpgradeController...\n");

    // Deploy TimelockUpgradeController
    const Timelock = await ethers.getContractFactory("TimelockUpgradeController");
    const timelock = await Timelock.deploy();
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();

    console.log("✅ TimelockUpgradeController deployed at:", timelockAddress);
    console.log("\n📋 Contract Details:");
    console.log("   - Upgrade Delay: 48 hours");
    console.log("   - Owner:", deployer.address);

    // Load existing proxy addresses
    const deployedAddresses = JSON.parse(
        fs.readFileSync("deployed_addresses_proxies.json", "utf8")
    );

    // Update and save addresses
    deployedAddresses.timelock = timelockAddress;
    fs.writeFileSync(
        "deployed_addresses_proxies.json",
        JSON.stringify(deployedAddresses, null, 2)
    );

    console.log("\n✨ TimelockUpgradeController deployed successfully!");
    console.log("📝 Addresses saved to deployed_addresses_proxies.json\n");
    console.log("Next steps:");
    console.log("1. Verify the Timelock contract on BaseScan");
    console.log("2. Use proposeUpgrade() to propose contract upgrades");
    console.log("3. Wait 48 hours before executing upgrades");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
