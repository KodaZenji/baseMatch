const hre = require("hardhat");
const fs = require("fs");

// Load deployed proxy addresses (current deployment)
const deployedAddresses = JSON.parse(
    fs.readFileSync("deployed_addresses_proxies.json", "utf8")
);

async function main() {
    console.log("========================================");
    console.log("Starting Contract Verification on Base Sepolia");
    console.log("Using PROXY Addresses (Current Deployment)");
    console.log("========================================\n");

    const contracts = [
        {
            name: "ProfileNFT (Proxy)",
            address: deployedAddresses.profileNFT,
            args: [],
        },
        {
            name: "Matching (Proxy)",
            address: deployedAddresses.matching,
            args: [],
        },
        {
            name: "Staking (Proxy)",
            address: deployedAddresses.staking,
            args: [],
        },
        {
            name: "Reputation (Proxy)",
            address: deployedAddresses.reputation,
            args: [],
        },
        {
            name: "Achievement (Proxy)",
            address: deployedAddresses.achievement,
            args: [],
        },
    ];

    const results = [];

    for (const contract of contracts) {
        console.log(`\n>>> Verifying ${contract.name}...`);
        console.log(`    Address: ${contract.address}`);
        console.log(`    Args: ${JSON.stringify(contract.args)}`);

        let retries = 3;
        let verified = false;

        while (retries > 0 && !verified) {
            try {
                await hre.run("verify:verify", {
                    address: contract.address,
                    constructorArguments: contract.args,
                });

                results.push({
                    contract: contract.name,
                    status: "✅ SUCCESS",
                    address: contract.address,
                });
                console.log(`✅ ${contract.name} verified successfully!`);
                verified = true;
            } catch (error) {
                if (error.message.includes("Already Verified")) {
                    results.push({
                        contract: contract.name,
                        status: "⏭️ ALREADY VERIFIED",
                        address: contract.address,
                    });
                    console.log(`⏭️ ${contract.name} is already verified.`);
                    verified = true;
                } else if (error.message.includes("Connect Timeout") && retries > 1) {
                    retries--;
                    console.log(`⏱️ Connection timeout, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
                } else {
                    results.push({
                        contract: contract.name,
                        status: "❌ FAILED",
                        address: contract.address,
                        error: error.message,
                    });
                    console.log(`❌ Verification failed for ${contract.name}`);
                    console.log(`   Error: ${error.message}`);
                    verified = true;
                }
            }
        }
    }

    // Print summary
    console.log("\n========================================");
    console.log("VERIFICATION SUMMARY");
    console.log("========================================");
    results.forEach((result) => {
        console.log(`${result.status} - ${result.contract}`);
        console.log(`   Address: ${result.address}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const allSuccessful = results.every(
        (r) =>
            r.status.includes("SUCCESS") || r.status.includes("ALREADY VERIFIED")
    );

    if (allSuccessful) {
        console.log("\n✅ All contracts verified successfully!\n");
    } else {
        console.log("\n⚠️ Some contracts failed verification. See errors above.\n");
        process.exitCode = 1;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
