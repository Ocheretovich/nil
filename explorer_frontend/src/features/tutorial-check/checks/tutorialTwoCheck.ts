import { HttpTransport, PublicClient, waitTillCompleted } from "@nilfoundation/niljs";
import { $rpcUrl, $smartAccount } from "../../account-connector/model";
import { $contracts, deploySmartContractFx } from "../../contracts/models/base";
import { App } from "../../../types";
import { tutorialContractStepFailedEvent, tutorialContractStepPassedEvent } from "../model";
import { setTutorialChecksState, TutorialChecksStatus } from "../../../pages/tutorials/model";

async function runTutorialCheckTwo() {
  const client = new PublicClient({
    transport: new HttpTransport({
      endpoint: $rpcUrl.getState(),
    }),
    shardId: 1,
  });

  const operatorContract = $contracts.getState().find((contract) => contract.name === "Operator")!;

  const customTokenContract = $contracts.getState().find((contract) => contract.name === "CustomToken")!;

  const appOperator: App = {
    name: "Operator",
    bytecode: operatorContract.bytecode,
    abi: operatorContract.abi,
    sourcecode: operatorContract.sourcecode,
  };

  const appCustomToken: App = {
    name: "CustomToken",
    bytecode: customTokenContract.bytecode,
    abi: customTokenContract.abi,
    sourcecode: customTokenContract.sourcecode,
  };

  console.log(appCustomToken);

  const smartAccount = $smartAccount.getState()!;

  const resultOperator = await deploySmartContractFx({
    app: appOperator,
    args: [],
    shardId: 1,
    smartAccount,
  });

  const resultCustomToken = await deploySmartContractFx({
    app: appCustomToken,
    args: [resultOperator.address],
    shardId: 2,
    smartAccount
  });

  tutorialContractStepPassedEvent("Operator and CustomToken have been deployed!");

  const hashMinting = await smartAccount.sendTransaction({
    to: resultCustomToken.address,
    abi: customTokenContract.abi,
    functionName: "checkMintToken",
    args: [resultCustomToken.address, 100_000n],
  });

  const resMinting = await waitTillCompleted(client, hashMinting);

  const checkMinting = resMinting.some((receipt) => !receipt.success);

  if (checkMinting) {
    setTutorialChecksState(TutorialChecksStatus.Failed);
    console.log(resMinting);
    tutorialContractStepFailedEvent("Failed to call mintTokenCustom()!");
    return;
  }

  tutorialContractStepPassedEvent("mintTokenCustom() has been called successfully!");

  const customTokenBalance = await client.getTokens(resultCustomToken.address, "latest");

  console.log(customTokenBalance);
}

export default runTutorialCheckTwo;