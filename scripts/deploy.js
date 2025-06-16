async function main() {
  const [deployer] = await ethers.getSigners();

  const oracleAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Chainlink ETH/USD Sepolia

  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  const auction = await DutchAuction.deploy(oracleAddress);
  await auction.waitForDeployment();

  console.log("DutchAuction deployed to:", await auction.getAddress());
}

main().catch((error) => {
  console.log("123", process.env.SEPOLIA_RPC_URL);
  console.error(error);
  process.exitCode = 1;
});
