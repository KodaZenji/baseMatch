const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying contracts to Base Sepolia...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy ProfileNFT
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");
    const profileNFT = await ProfileNFT.deploy();
    await profileNFT.waitForDeployment();
    const profileNFTAddress = await profileNFT.getAddress();
    console.log("ProfileNFT deployed to:", profileNFTAddress);

    // Deploy Matching
    const Matching = await ethers.getContractFactory("Matching");
    const matching = await Matching.deploy(profileNFTAddress);
    await matching.waitForDeployment();
    const matchingAddress = await matching.getAddress();
    console.log("Matching deployed to:", matchingAddress);

    // Deploy Staking
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(USDC_ADDRESS, matchingAddress);
    await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();
    console.log("Staking deployed to:", stakingAddress);

    // Deploy Reputation
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy(matchingAddress);
    await reputation.waitForDeployment();
    const reputationAddress = await reputation.getAddress();
    console.log("Reputation deployed to:", reputationAddress);

    // Deploy Achievement
    const Achievement = await ethers.getContractFactory("Achievement");
    const achievement = await Achievement.deploy();
    await achievement.waitForDeployment();
    const achievementAddress = await achievement.getAddress();
    console.log("Achievement deployed to:", achievementAddress);

    // Link ProfileNFT to Matching contract for cleanup coordination
    console.log("Setting Matching contract address in ProfileNFT...");
    const setMatchingTx = await profileNFT.setMatchingContract(matchingAddress);
    await setMatchingTx.wait();
    console.log("Matching contract linked to ProfileNFT");

    // Save addresses to a file for easy access
    const fs = require("fs");
    const addresses = {
        ProfileNFT: profileNFTAddress,
        Matching: matchingAddress,
        Staking: stakingAddress,
        Reputation: reputationAddress,
        Achievement: achievementAddress,
        USDC: USDC_ADDRESS
    };

    fs.writeFileSync(
        "deployed_addresses.json",
        JSON.stringify(addresses, null, 2)
    );
    console.log("Addresses saved to deployed_addresses.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});