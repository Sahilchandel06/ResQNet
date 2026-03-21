// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ResQNetProtocol {
    error CallerIsNotOwner();
    error SOSAlreadyLogged();
    error InvalidStatus();

    struct SOSLog {
        uint256 id;
        address volunteer;
        string status;
        uint256 timestamp;
    }

    address public owner;

    mapping(uint256 => SOSLog) public sosLogs;
    mapping(uint256 => bool) public sosExists;
    mapping(address => int256) public reputation;

    event SOSLogged(
        uint256 indexed id,
        address indexed volunteer,
        string status,
        uint256 timestamp,
        int256 newReputation
    );

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert CallerIsNotOwner();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function logSOS(
        uint256 _id,
        address _volunteer,
        string memory _status
    ) external onlyOwner {
        if (sosExists[_id]) {
            revert SOSAlreadyLogged();
        }

        bytes32 normalized = keccak256(bytes(_status));
        if (
            normalized != keccak256(bytes("completed")) &&
            normalized != keccak256(bytes("fake"))
        ) {
            revert InvalidStatus();
        }

        sosLogs[_id] = SOSLog({
            id: _id,
            volunteer: _volunteer,
            status: _status,
            timestamp: block.timestamp
        });
        sosExists[_id] = true;

        if (normalized == keccak256(bytes("completed"))) {
            reputation[_volunteer] += 1;
        } else {
            reputation[_volunteer] -= 1;
        }

        emit SOSLogged(
            _id,
            _volunteer,
            _status,
            block.timestamp,
            reputation[_volunteer]
        );
    }

    function getSOS(
        uint256 _id
    )
        external
        view
        returns (uint256 id, address volunteer, string memory status, uint256 timestamp)
    {
        SOSLog memory entry = sosLogs[_id];
        return (entry.id, entry.volunteer, entry.status, entry.timestamp);
    }

    function getReputation(address user) external view returns (int256) {
        return reputation[user];
    }
}
