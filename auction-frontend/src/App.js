import { useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";
import erc721Abi from "./erc721Abi";
import "./App.css";
import abi from "./DutchAuction.json";

const contractAddress = "0x5a79b1A802606027c230FEeb3FA16da2E1Ca352F";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [auctionId, setAuctionId] = useState("");
  const [price, setPrice] = useState("");

  const [form, setForm] = useState({
    nftAddress: "",
    tokenId: "",
    startUsd: "",
    endUsd: "",
    duration: "",
  });

  const connectWallet = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const auctionContract = new Contract(contractAddress, abi, signer);

    setProvider(provider);
    setSigner(signer);
    setContract(auctionContract);
    setConnectedAddress(address);
  };

  const createAuction = async () => {
    try {
      // 1. Zatwierdzenie NFT
      const nft = new Contract(form.nftAddress, erc721Abi, signer);
      const approveTx = await nft.approve(contractAddress, form.tokenId);
      await approveTx.wait();
      alert("NFT zatwierdzone dla kontraktu aukcyjnego");

      // 2. Utworzenie aukcji
      const tx = await contract.createAuction(
        form.nftAddress,
        form.tokenId,
        Math.floor(Number(form.startUsd)),
        Math.floor(Number(form.endUsd)),
        form.duration
      );
      console.log(tx);
      await tx.wait();
      alert("✅ Aukcja utworzona!");
    } catch (error) {
      console.error("Błąd:", error);
      alert("Coś poszło nie tak. Sprawdź konsolę.");
    }
  };

  const fetchActiveAuctions = async () => {
    if (!contract) {
      alert("Najpierw połącz portfel!");
      return;
    }

    const count = await contract.auctionCounter();
    const active = [];

    for (let i = 1; i <= count; i++) {
      const auction = await contract.auctions(i);
      if (auction.active) {
        active.push({ id: i, ...auction });
      }
    }

    setActiveAuctions(active);
  };

  const fetchPrice = async () => {
    const p = await contract.getCurrentPriceInUsd(auctionId);
    setPrice(p.toString() + " $");
  };

  const buy = async () => {
    const priceWei = await contract.getCurrentPrice(auctionId);
    const tx = await contract.buy(auctionId, { value: priceWei });
    await tx.wait();
    alert("Zakupiono NFT!");
  };

  return (
    <div className="App">
      <h1>Dutch Auction</h1>
      {!connectedAddress ? (
        <button onClick={connectWallet}>Połącz z MetaMask</button>
      ) : (
        <p>Połączono jako: {connectedAddress}</p>
      )}

      <h2>Stwórz aukcję</h2>
      <input
        placeholder="NFT address"
        onChange={(e) => setForm({ ...form, nftAddress: e.target.value })}
      />
      <input
        placeholder="Token ID"
        onChange={(e) => setForm({ ...form, tokenId: e.target.value })}
      />
      <input
        placeholder="Cena startowa ($)"
        onChange={(e) => setForm({ ...form, startUsd: e.target.value })}
      />
      <input
        placeholder="Cena końcowa ($)"
        onChange={(e) => setForm({ ...form, endUsd: e.target.value })}
      />
      <input
        placeholder="Czas trwania (sekundy)"
        onChange={(e) => setForm({ ...form, duration: e.target.value })}
      />
      <button onClick={createAuction}>Utwórz aukcję</button>

      <h2>Sprawdź cenę aukcji</h2>
      <input
        placeholder="ID aukcji"
        value={auctionId}
        onChange={(e) => setAuctionId(e.target.value)}
      />
      <button onClick={fetchPrice}>Sprawdź aktualną cenę</button>
      <p>Cena: {price}</p>

      <h2>Kup NFT</h2>
      <button onClick={buy}>Kup</button>

      <h2>Aktywne aukcje</h2>
      <button onClick={fetchActiveAuctions}>Pobierz aukcje</button>
      <div>
        {activeAuctions.map((auction) => (
          <div key={auction.id}>{auction.id}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
