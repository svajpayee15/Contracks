const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Contracks Suite Deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("----------------------------------------------------");

  const Salary = await hre.ethers.deployContract("SalaryTemplate");
  const Perf = await hre.ethers.deployContract("PerformanceTemplate");
  const FFP = await hre.ethers.deployContract("FFPTemplate");
  const Vote = await hre.ethers.deployContract("PlainAgreementTemplate");

  await Salary.waitForDeployment();
  await Perf.waitForDeployment();
  await FFP.waitForDeployment();
  await Vote.waitForDeployment();

  const salaryAddress = await Salary.getAddress();
  const perfAddress = await Perf.getAddress();
  const ffpAddress = await FFP.getAddress();
  const voteAddress = await Vote.getAddress();

  console.log(`✅ SalaryTemplate CA: ${salaryAddress}`);
  console.log(`✅ PerformanceTemplate CA: ${perfAddress}`);
  console.log(`✅ FFPTemplate CA: ${ffpAddress}`);
  console.log(`✅ BoardVotingTemplate CA: ${voteAddress}`);
  console.log(`✅ PlainAgreementTemplate CA: ${voteAddress}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
