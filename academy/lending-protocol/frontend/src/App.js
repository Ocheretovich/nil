import React, { useState } from "react";
import { encodeFunctionData } from "viem";
import "./App.css";
import { waitTillCompleted } from "@nilfoundation/niljs";
import abi from "./artifacts/lendingPool.json";
import { processReceipts } from "./utils/receiptChecker";
import { createClient } from "./utils/createClient";

function App() {
  const [activeTab, setActiveTab] = useState("lend");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state to disable only transaction buttons

  // Contract address placeholder - replace with your actual contract address
  const contractAddress = "0x00015bf5ffa4d16d7132cc32a746003092e98d83";
  const contractABI = abi.abi; // Replace with your actual contract ABI

  const publicClient = createClient();

  const ETH = "0x0001111111111111111111111111111111111112";
  const USDT = "0x0001111111111111111111111111111111111113";

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (window.nil) {
        const accounts = await window.nil.request({
          method: "eth_requestAccounts",
        });
        console.log("Connected account:", accounts[0]);
        //set account
        setAccount(accounts[0]);
        setWalletConnected(true);
      } else {
        alert("Please install =nil; wallet from the chrome store!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAmount("");
  };

  // Handle amount input change
  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  // Handle token selection
  const handleTokenChange = (e) => {
    setSelectedToken(e.target.value);
  };

  // Handle Lend function
  const handleLend = async () => {
    if (!walletConnected || !amount) return;
    setIsLoading(true); // Start loading

    try {
      const token = selectedToken === "ETH" ? ETH : USDT;

      const data = encodeFunctionData({
        abi: contractABI,
        functionName: "deposit",
      });
      console.log(amount);
      const txData = {
        to: contractAddress,
        data,
        tokens: [
          {
            id: token,
            amount: Number(amount),
          },
        ],
      };

      console.log("txData:", txData);

      const txHash = await window.nil.request({
        method: "eth_sendTransaction",
        params: [txData],
      });
      console.log("Transaction hash:", txHash);
      setLastTxHash(txHash);

      const receiptsAlternative = await waitTillCompleted(
        (await publicClient).publicClient,
        txHash
      );
      console.log("Transaction Receipts:", receiptsAlternative);
      const error = processReceipts(receiptsAlternative);
      if (error) {
        console.log(`Transaction failed: ${error}`);
        alert(`Lending failed: ${error}`);
      } else {
        alert("Lending successful!");
      }

      setAmount(""); // Reset the amount field
    } catch (error) {
      console.error("Error in lending:", error);
      alert("Error in lending. Check console for details.");
    } finally {
      setIsLoading(false); // End loading
    }
  };

  // Handle Borrow function
  const handleBorrow = async () => {
    if (!walletConnected || !amount) return;
    setIsLoading(true); // Start loading

    try {
      const token = selectedToken === "ETH" ? ETH : USDT;
      const data = encodeFunctionData({
        abi: contractABI,
        functionName: "borrow",
        args: [Number(amount), token],
      });
      console.log(amount);
      const txData = {
        to: contractAddress,
        data,
      };

      console.log("txData:", txData);

      const txHash = await window.nil.request({
        method: "eth_sendTransaction",
        params: [txData],
      });
      console.log("Transaction hash:", txHash);
      const receiptsAlternative = await waitTillCompleted(
        (await publicClient).publicClient,
        txHash
      );

      console.log(receiptsAlternative.length);
      console.log("Transaction Receipts:", receiptsAlternative);
      const error = processReceipts(receiptsAlternative);
      if (error) {
        console.log(`Transaction failed: ${error}`);
        alert(`Borrow failed: ${error}`);
      } else {
        alert("Borrowing successful!");
      }

      setLastTxHash(txHash);
      setAmount(""); // Reset the amount field
    } catch (error) {
      console.error("Error in borrowing:", error);
      alert("Error in borrowing. Check console for details.");
    } finally {
      setIsLoading(false); // End loading
    }
  };

  // Handle Repay function
  const handleRepay = async () => {
    if (!walletConnected || !amount) return;
    setIsLoading(true); // Start loading

    try {
      const token = selectedToken === "ETH" ? ETH : USDT;

      const data = encodeFunctionData({
        abi: contractABI,
        functionName: "repayLoan",
      });

      const txData = {
        to: contractAddress,
        data,
        tokens: [
          {
            id: token,
            amount: Number(amount),
          },
        ],
      };

      console.log("txData:", txData);

      const txHash = await window.nil.request({
        method: "eth_sendTransaction",
        params: [txData],
      });
      console.log("Transaction hash:", txHash);
      const receiptsAlternative = await waitTillCompleted(
        (await publicClient).publicClient,
        txHash
      );
      console.log("Transaction Receipts:", receiptsAlternative);
      const error = processReceipts(receiptsAlternative);
      if (error) {
        console.log(`Transaction failed: ${error}`);
        alert(`Repay failed: ${error}`);
      } else {
        alert("Repay successful!");
      }

      setLastTxHash(txHash);
      setAmount(""); // Reset the amount field
    } catch (error) {
      console.error("Error in repaying:", error);
      alert("Error in repaying. Check console for details.");
    } finally {
      setIsLoading(false); // End loading
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">DeFi Lending Platform</div>
        <div className="wallet-section">
          {!walletConnected ? (
            <button className="connect-wallet-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="account-info">
              {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="info-text">
          <h2>Welcome to the Example Lending Protocol</h2>
          <p>
            This is an example application that lets you lend, borrow, and repay
            borrowed loans.
          </p>
          <p>
            <strong>Note:</strong> Make sure to install the{" "}
            <a
              href="https://chromewebstore.google.com/detail/nil-wallet/kfiailmjchdbjmadbkkldiahpggcjffp?hl=en-GB&utm_source=ext_sidebar"
              target="_blank"
              rel="noopener noreferrer"
            >
              =nil; wallet
            </a>{" "}
            to get started.
          </p>
          <p> This app is for demonstration purposes only.</p>
        </div>

        <div className="container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "lend" ? "active" : ""}`}
              onClick={() => handleTabChange("lend")}
              disabled={isLoading} // Disable tabs only if a transaction is in progress
            >
              Lend
            </button>
            <button
              className={`tab ${activeTab === "borrow" ? "active" : ""}`}
              onClick={() => handleTabChange("borrow")}
              disabled={isLoading} // Disable tabs only if a transaction is in progress
            >
              Borrow
            </button>
            <button
              className={`tab ${activeTab === "repay" ? "active" : ""}`}
              onClick={() => handleTabChange("repay")}
              disabled={isLoading} // Disable tabs only if a transaction is in progress
            >
              Repay
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "lend" && (
              <div className="tab-panel">
                <h3>Lend Assets</h3>
                <div className="input-container">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    disabled={isLoading} // Disable input if transaction is processing
                  />
                  <select
                    value={selectedToken}
                    onChange={handleTokenChange}
                    disabled={isLoading} // Disable dropdown if transaction is processing
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <button
                  className="action-button"
                  onClick={handleLend}
                  disabled={isLoading || !amount} // Disable button while loading
                >
                  {isLoading ? "Processing..." : "Lend"}
                </button>
              </div>
            )}

            {activeTab === "borrow" && (
              <div className="tab-panel">
                <h3>Borrow Assets</h3>
                <div className="input-container">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    disabled={isLoading}
                  />
                  <select
                    value={selectedToken}
                    onChange={handleTokenChange}
                    disabled={isLoading}
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <button
                  className="action-button"
                  onClick={handleBorrow}
                  disabled={isLoading || !amount}
                >
                  {isLoading ? "Processing..." : "Borrow"}
                </button>
              </div>
            )}

            {activeTab === "repay" && (
              <div className="tab-panel">
                <h3>Repay Loan</h3>
                <div className="input-container">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    disabled={isLoading}
                  />
                  <select
                    value={selectedToken}
                    onChange={handleTokenChange}
                    disabled={isLoading}
                  >
                    <option value="ETH">ETH</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <button
                  className="action-button"
                  onClick={handleRepay}
                  disabled={isLoading || !amount}
                >
                  {isLoading ? "Processing..." : "Repay"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="info-text transaction-note">
          <p className="exchange-rate">
            <strong>Exchange Rate:</strong> 1 ETH = 2 USDT
          </p>
          {lastTxHash && (
            <p className="tx-hash">
              <strong>Tx Hash:</strong> {lastTxHash}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
