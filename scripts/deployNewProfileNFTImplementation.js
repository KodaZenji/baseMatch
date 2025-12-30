const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Deploying new ProfileNFT implementation with birthYear support...");

    // Get the contract factory
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");

    try {
        // Deploy the new implementation (without proxy)
        console.log("\n📝 Deploying new implementation contract...");
        const newImplementation = await upgrades.deployImplementation(ProfileNFT, [], {
            kind: 'uups'
        });

        console.log("✅ New ProfileNFT implementation deployed successfully!");
        console.log("🔗 New Implementation Address:", newImplementation);

        console.log("\n💡 To upgrade your existing proxy to this implementation:");
        console.log("   1. Use your existing proxy address");
        console.log("   2. Call upgrades.upgradeProxy(proxyAddress, ProfileNFT)");
        console.log("   3. The proxy will point to this new implementation");

        console.log("\n📋 Implementation details:");
        console.log("- Uses birthYear for dynamic age calculation");
        console.log("- Maintains backward compatibility with age field");
        console.log("- Provides getCurrentAge() function for up-to-date age");
        console.log("- Stores both uint8 age (for compatibility) and uint256 birthYear");

    } catch (deployError) {
        console.error("❌ Deployment failed:", deployError);

        if (deployError.message.includes("New storage layout is incompatible")) {
            console.log("\n⚠️  Storage layout incompatibility detected.");
            console.log("💡 Consider using a different upgrade approach.");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deployment:", error);
        process.exit(1);
    });