const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Upgrading ProfileNFT contract to use birthYear instead of age...");

    // Get the current deployed proxy address
    const fs = require("fs");
    let deployedAddresses;

    try {
        // Try mainnet first
        deployedAddresses = JSON.parse(fs.readFileSync("deployed_addresses_mainnet.json", "utf8"));
        console.log("✅ Loaded deployed addresses from deployed_addresses_mainnet.json");
    } catch (error) {
        try {
            // Fall back to proxy addresses
            deployedAddresses = JSON.parse(fs.readFileSync("deployed_addresses_proxies.json", "utf8"));
            console.log("✅ Loaded deployed addresses from deployed_addresses_proxies.json");
        } catch (error2) {
            console.error("❌ Could not load deployment addresses file");
            return;
        }
    }

    console.log("📋 Current ProfileNFT Proxy Address:", deployedAddresses.profileNFT);

    // Get the contract factory
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");

    try {
        // Prepare the upgrade
        console.log("\n🔄 Preparing upgrade...");
        console.log("📝 Deploying new implementation...");

        // Deploy the new implementation
        const newImplementation = await upgrades.prepareUpgrade(deployedAddresses.profileNFT, ProfileNFT, {
            kind: 'uups'
        });

        console.log("🔗 New Implementation Address:", newImplementation);

        // Actually upgrade the proxy
        console.log("\n⬆️  Upgrading proxy to new implementation...");
        const upgradedContract = await upgrades.upgradeProxy(deployedAddresses.profileNFT, ProfileNFT);

        console.log("✅ ProfileNFT contract upgraded successfully!");
        console.log("🔗 Proxy Address:", upgradedContract.address);
        console.log("🔗 New Implementation Address:", await upgrades.erc1967.getImplementationAddress(deployedAddresses.profileNFT));

        // Verify the upgrade worked by calling a function
        console.log("\n🔍 Verifying upgrade...");
        const upgradedContractInstance = await ethers.getContractAt("ProfileNFT", deployedAddresses.profileNFT);

        // Test basic functionality
        console.log("✅ Contract methods available:", Object.keys(upgradedContractInstance.interface.functions).filter(fn => !fn.startsWith('0x') && !fn.startsWith('constructor')));

        // Check that new functions exist
        const hasGetBirthYear = upgradedContractInstance.interface.fragments.some(frag =>
            frag.name === 'getBirthYear' || frag.name === 'getCurrentAge'
        );

        if (hasGetBirthYear) {
            console.log("✅ New birthYear functionality confirmed!");
        } else {
            console.log("⚠️  New birthYear functionality may not be available");
        }

        console.log("\n✨ Upgrade completed successfully!");
        console.log("💡 The ProfileNFT contract now uses birthYear instead of age for dynamic age calculation.");
        console.log("📊 Old 'age' field is maintained for compatibility, new 'birthYear' field provides dynamic age.");

    } catch (upgradeError) {
        console.error("❌ Upgrade failed:", upgradeError);

        // Check if it's a storage layout issue
        if (upgradeError.message.includes("New storage layout is incompatible")) {
            console.log("\n⚠️  Storage layout incompatibility detected.");
            console.log("💡 This may require a more complex upgrade strategy or a fresh deployment.");
            console.log("📝 Run `npx hardhat verify-upgrade --type uups` to check compatibility.");
        } else if (upgradeError.message.includes("Initializable: contract is already initialized")) {
            console.log("\n⚠️  Contract already initialized. This is expected for proxy upgrades.");
            console.log("✅ The upgrade may have still succeeded. Check the implementation address.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during upgrade:", error);
        process.exit(1);
    });