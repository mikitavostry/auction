// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract DutchAuction {
    struct Auction {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 startPriceWei;
        uint256 endPriceWei;
        uint256 duration;
        uint256 startTime;
        bool active;
    }

    AggregatorV3Interface public priceFeed;
    uint256 public auctionCounter;
    mapping(uint256 => Auction) public auctions;

    event AuctionCreated(
        uint256 auctionId,
        address seller,
        address nft,
        uint256 tokenId
    );
    event NFTPurchased(uint256 auctionId, address buyer, uint256 priceWei);

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getETHPriceInUSD() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price) * 1e10;
    }

    function createAuction(
        address nftAddress,
        uint256 tokenId,
        uint256 startPriceUsd,
        uint256 endPriceUsd,
        uint256 duration
    ) external {
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(
            nft.getApproved(tokenId) == address(this),
            "Contract not approved"
        );

        uint256 ethPrice = getETHPriceInUSD(); // 18 decimals
        uint256 startPriceWei = (startPriceUsd * 1e36) / ethPrice;
        uint256 endPriceWei = (endPriceUsd * 1e36) / ethPrice;

        require(startPriceWei > endPriceWei, "Start price must be higher");

        auctionCounter++;
        auctions[auctionCounter] = Auction({
            seller: msg.sender,
            nftAddress: nftAddress,
            tokenId: tokenId,
            startPriceWei: startPriceWei,
            endPriceWei: endPriceWei,
            duration: duration,
            startTime: block.timestamp,
            active: true
        });

        emit AuctionCreated(auctionCounter, msg.sender, nftAddress, tokenId);
    }

    function getCurrentPrice(uint256 auctionId) public view returns (uint256) {
        Auction memory auction = auctions[auctionId];
        require(auction.active, "Auction not active");

        uint256 elapsed = block.timestamp - auction.startTime;
        if (elapsed >= auction.duration) return auction.endPriceWei;

        uint256 diff = auction.startPriceWei - auction.endPriceWei;
        uint256 decay = (diff * elapsed) / auction.duration;
        return auction.startPriceWei - decay;
    }

    function getCurrentPriceInUsd(
        uint256 auctionId
    ) public view returns (uint256) {
        uint256 priceWei = getCurrentPrice(auctionId);
        uint256 ethPrice = getETHPriceInUSD();
        return (priceWei * ethPrice) / 1e36;
    }

    function buy(uint256 auctionId) external payable {
        Auction storage auction = auctions[auctionId];
        require(auction.active, "Auction not active");

        uint256 price = getCurrentPrice(auctionId);
        require(msg.value >= price, "Insufficient payment");

        auction.active = false;

        IERC721(auction.nftAddress).safeTransferFrom(
            auction.seller,
            msg.sender,
            auction.tokenId
        );
        payable(auction.seller).transfer(price);

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NFTPurchased(auctionId, msg.sender, price);
    }
}
