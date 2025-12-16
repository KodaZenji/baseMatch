const { ethers } = require("hardhat");

async function main() {
    const achievementAddress = "0x3542dEB52188887Addd04533305cCfe7DC848604";
    const IPFS_BASE = "https://equal-bronze-bat.myfilebase.com/ipfs/QmUaKVFosUfGagYmuE9fTqkw19LKJ9F3Job7QEtrnUZJdW/";

    const achievement = await ethers.getContractAt("Achievement", achievementAddress);

    const metadata = [
        { tokenId: 1, file: "first-date.json", name: "First Date" },
        { tokenId: 2, file: "5-dates.json", name: "5 Dates" },
        { tokenId: 3, file: "10-dates.json", name: "10 Dates" },
        { tokenId: 4, file: "5-star.json", name: "5 Star Rating" },
        { tokenId: 5, file: "perfect-week.json", name: "Perfect Week" },
        { tokenId: 6, file: "match-maker.json", name: "Match Maker" },
    ];

    console.log("Setting IPFS metadata URIs...\n");

    for (const item of metadata) {
        const uri = IPFS_BASE + item.file;
        console.log(`Setting tokenId ${item.tokenId} (${item.name}) → ${uri}`);

        const tx = await achievement.setAchievementMetadataURI(item.tokenId, uri);
        await tx.wait();
        console.log(`✅ TokenId ${item.tokenId} set\n`);
    }

    console.log("✅ All metadata URIs configured!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
