// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TimelockUpgradeController
 * @dev Controls contract upgrades with a 48-hour timelock for transparency
 * @notice This ensures all upgrades are announced 48 hours in advance before execution
 */
contract TimelockUpgradeController is Ownable {
    // 48 hours delay in seconds
    uint256 public constant UPGRADE_DELAY = 48 hours;
    
    struct UpgradeProposal {
        address target;
        address newImplementation;
        uint256 eta; // Estimated time of arrival (when it can be executed)
        bool executed;
        bool cancelled;
    }
    
    // proposalId => UpgradeProposal
    mapping(bytes32 => UpgradeProposal) public proposals;
    
    event UpgradeProposed(
        bytes32 indexed proposalId,
        address indexed target,
        address indexed newImplementation,
        uint256 eta
    );
    
    event UpgradeExecuted(
        bytes32 indexed proposalId,
        address indexed target,
        address indexed newImplementation
    );
    
    event ProposalCancelled(bytes32 indexed proposalId);

    /**
     * @dev Initialize the Timelock with owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Propose an upgrade for a contract (only owner)
     * @param target The contract to upgrade
     * @param newImplementation The new implementation address
     */
    function proposeUpgrade(address target, address newImplementation) 
        external 
        onlyOwner 
        returns (bytes32) 
    {
        require(target != address(0), "Invalid target");
        require(newImplementation != address(0), "Invalid implementation");
        
        bytes32 proposalId = keccak256(abi.encodePacked(target, newImplementation, block.timestamp));
        uint256 eta = block.timestamp + UPGRADE_DELAY;
        
        proposals[proposalId] = UpgradeProposal({
            target: target,
            newImplementation: newImplementation,
            eta: eta,
            executed: false,
            cancelled: false
        });
        
        emit UpgradeProposed(proposalId, target, newImplementation, eta);
        return proposalId;
    }
    
    /**
     * @dev Check if an upgrade is ready to execute
     */
    function isUpgradeReady(bytes32 proposalId) external view returns (bool) {
        UpgradeProposal storage proposal = proposals[proposalId];
        return block.timestamp >= proposal.eta && !proposal.executed && !proposal.cancelled;
    }
    
    /**
     * @dev Get time remaining until upgrade can be executed (in seconds)
     */
    function getTimeUntilReady(bytes32 proposalId) external view returns (uint256) {
        UpgradeProposal storage proposal = proposals[proposalId];
        if (block.timestamp >= proposal.eta) return 0;
        return proposal.eta - block.timestamp;
    }
    
    /**
     * @dev Cancel a proposed upgrade (only owner)
     */
    function cancelUpgrade(bytes32 proposalId) external onlyOwner {
        UpgradeProposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Upgrade already executed");
        require(!proposal.cancelled, "Upgrade already cancelled");
        
        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(bytes32 proposalId) 
        external 
        view 
        returns (
            address target,
            address newImplementation,
            uint256 eta,
            bool executed,
            bool cancelled
        ) 
    {
        UpgradeProposal storage proposal = proposals[proposalId];
        return (
            proposal.target,
            proposal.newImplementation,
            proposal.eta,
            proposal.executed,
            proposal.cancelled
        );
    }
}
