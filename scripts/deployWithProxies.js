const hre = require("hardhat");
const { upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Deploying BaseMatch contracts with UUPS proxies on Base Sepolia...\n");

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy ProfileNFT proxy
    console.log("\n1️⃣ Deploying ProfileNFT proxy...");
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");
    const profileNFT = await upgrades.deployProxy(ProfileNFT, [], {
        kind: "uups",
        initializer: "initialize",
    });
    await profileNFT.waitForDeployment();
    const profileNFTAddr = await profileNFT.getAddress();
    console.log("✅ ProfileNFT proxy deployed at:", profileNFTAddr);

    // Deploy Matching proxy
    console.log("\n2️⃣ Deploying Matching proxy...");
    const Matching = await ethers.getContractFactory("Matching");
    const matching = await upgrades.deployProxy(Matching, [profileNFTAddr], {
        kind: "uups",
        initializer: "initialize",
    });
    await matching.waitForDeployment();
    const matchingAddr = await matching.getAddress();
    console.log("✅ Matching proxy deployed at:", matchingAddr);

    // Deploy Reputation proxy
    console.log("\n3️⃣ Deploying Reputation proxy...");
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await upgrades.deployProxy(Reputation, [matchingAddr], {
        kind: "uups",
        initializer: "initialize",
    });
    await reputation.waitForDeployment();
    const reputationAddr = await reputation.getAddress();
    console.log("✅ Reputation proxy deployed at:", reputationAddr);

    // Deploy Achievement proxy
    console.log("\n4️⃣ Deploying Achievement proxy...");
    const Achievement = await ethers.getContractFactory("Achievement");
    const achievement = await upgrades.deployProxy(Achievement, [], {
        kind: "uups",
        initializer: "initialize",
    });
    await achievement.waitForDeployment();
    const achievementAddr = await achievement.getAddress();
    console.log("✅ Achievement proxy deployed at:", achievementAddr);

    // Deploy Staking proxy
    console.log("\n5️⃣ Deploying Staking proxy...");
    const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(Staking, [USDC_ADDRESS, matchingAddr], {
        kind: "uups",
        initializer: "initialize",
    });
    await staking.waitForDeployment();
    const stakingAddr = await staking.getAddress();
    console.log("✅ Staking proxy deployed at:", stakingAddr);

    // Set up Matching contract reference in ProfileNFT
    console.log("\n🔗 Setting up contract references...");
    const tx1 = await profileNFT.setMatchingContract(matchingAddr);
    await tx1.wait();
    console.log("✅ ProfileNFT -> Matching reference set");

    // Save deployment addresses
    const deployedAddresses = {
        profileNFT: profileNFTAddr,
        matching: matchingAddr,
        reputation: reputationAddr,
        achievement: achievementAddr,
        staking: stakingAddr,
        usdc: USDC_ADDRESS,
        deployer: deployer.address,
        network: "Base Sepolia",
        timestamp: new Date().toISOString(),
    };

    const fs = require("fs");
    fs.writeFileSync(
        "deployed_addresses_proxies.json",
        JSON.stringify(deployedAddresses, null, 2)
    );

    console.log("\n✨ Deployment complete! Addresses saved to deployed_addresses_proxies.json\n");
    console.log("📋 Deployed Addresses:");
    console.log(JSON.stringify(deployedAddresses, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
