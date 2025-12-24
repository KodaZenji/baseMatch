const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying BaseMatch mainnet contracts...\n");

    // Load deployed addresses
    const fs = require("fs");
    let deployedAddresses;

    try {
        deployedAddresses = JSON.parse(fs.readFileSync("deployed_addresses_mainnet.json", "utf8"));
        console.log("✅ Loaded deployed addresses from deployed_addresses_mainnet.json");
    } catch (error) {
        console.log("⚠️  deployed_addresses_mainnet.json not found, checking for other deployment files...");
        try {
            deployedAddresses = JSON.parse(fs.readFileSync("deployed_addresses_proxies.json", "utf8"));
            console.log("✅ Loaded deployed addresses from deployed_addresses_proxies.json");
        } catch (error2) {
            console.error("❌ Could not load deployment addresses file");
            return;
        }
    }

    console.log("📋 Contract addresses to verify:");
    console.log("- ProfileNFT:", deployedAddresses.profileNFT);
    console.log("- Matching:", deployedAddresses.matching);
    console.log("- Reputation:", deployedAddresses.reputation);
    console.log("- Achievement:", deployedAddresses.achievement);
    console.log("- Staking:", deployedAddresses.staking);
    console.log("");

    // Verify each contract
    const contracts = [
        { name: "ProfileNFT", address: deployedAddresses.profileNFT, args: [] },
        { name: "Matching", address: deployedAddresses.matching, args: [deployedAddresses.profileNFT] },
        { name: "Reputation", address: deployedAddresses.reputation, args: [deployedAddresses.matching] },
        { name: "Achievement", address: deployedAddresses.achievement, args: [] },
        { name: "Staking", address: deployedAddresses.staking, args: [deployedAddresses.usdc] },
    ];

    for (const contract of contracts) {
        try {
            console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);

            await hre.run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.args,
            });

            console.log(`✅ ${contract.name} verified successfully!`);
        } catch (error) {
            if (error.message.includes("Contract source code already verified")) {
                console.log(`⚠️  ${contract.name} already verified`);
            } else {
                console.error(`❌ Failed to verify ${contract.name}:`, error.message);
            }
        }
    }

    console.log("\n✨ Verification process completed!");
    console.log("📋 Remember to also update your frontend environment variables with these addresses.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });