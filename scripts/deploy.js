const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying contracts to Base Sepolia...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy ProfileNFT
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");
    const profileNFT = await ProfileNFT.deploy();
    await profileNFT.deployed();
    console.log("ProfileNFT deployed to:", profileNFT.address);

    // Deploy Matching
    const Matching = await ethers.getContractFactory("Matching");
    const matching = await Matching.deploy(profileNFT.address);
    await matching.deployed();
    console.log("Matching deployed to:", matching.address);

    // Deploy Staking
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(USDC_ADDRESS, matching.address);
    await staking.deployed();
    console.log("Staking deployed to:", staking.address);

    // Deploy Reputation
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy(matching.address);
    await reputation.deployed();
    console.log("Reputation deployed to:", reputation.address);

    // Deploy Achievement
    const Achievement = await ethers.getContractFactory("Achievement");
    const achievement = await Achievement.deploy();
    await achievement.deployed();
    console.log("Achievement deployed to:", achievement.address);

    // Save addresses to a file for easy access
    const fs = require("fs");
    const addresses = {
        ProfileNFT: profileNFT.address,
        Matching: matching.address,
        Staking: staking.address,
        Reputation: reputation.address,
        Achievement: achievement.address,
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