// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ResQNetProtocol {
    error CallerIsNotOwner();
    error SOSAlreadyExists();
    error SOSNotFound();
    error InvalidStatus();
    error VolunteerNotAssigned();
    error VolunteerNotReported();
    error SOSAlreadyFinalized();
    error MismatchedFinalStatus();
    error InvalidRewardAmount();
    error RewardTransferFailed();

    struct SOSRecord {
        uint256 sosId;
        string reporterName;
        address reporterWallet;
        string message;
        string emergencyType;
        string priority;
        bool suspicious;
        string status;
        string volunteerName;
        address volunteerWallet;
        string assignedBy;
        string volunteerNote;
        string volunteerReportedStatus;
        string finalizedBy;
        string adminNote;
        uint256 createdAt;
        uint256 assignedAt;
        uint256 volunteerReportedAt;
        uint256 completedAt;
        uint256 rewardPaidWei;
        uint256 rewardPaidAt;
    }

    address public owner;
    uint256 public rewardAmount;

    mapping(uint256 => SOSRecord) private sosRecords;
    mapping(uint256 => bool) public sosExists;
    mapping(address => int256) public reputation;

    event SOSCreated(
        uint256 indexed sosId,
        string reporterName,
        address indexed reporterWallet,
        string emergencyType,
        string priority,
        uint256 timestamp
    );
    event VolunteerAssigned(
        uint256 indexed sosId,
        address indexed volunteerWallet,
        string volunteerName,
        string assignedBy,
        uint256 timestamp
    );
    event VolunteerReported(
        uint256 indexed sosId,
        address indexed volunteerWallet,
        string status,
        string volunteerNote,
        uint256 timestamp
    );
    event SOSFinalized(
        uint256 indexed sosId,
        address indexed volunteerWallet,
        string status,
        string finalizedBy,
        int256 newReputation,
        uint256 rewardPaidWei,
        uint256 timestamp
    );
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert CallerIsNotOwner();
        }
        _;
    }

    constructor() {
        owner = msg.sender;
        rewardAmount = 0.0001 ether;
    }

    function createSOS(
        uint256 _sosId,
        string memory _reporterName,
        address _reporterWallet,
        string memory _message,
        string memory _emergencyType,
        string memory _priority,
        bool _suspicious
    ) external onlyOwner {
        if (sosExists[_sosId]) {
            revert SOSAlreadyExists();
        }

        sosRecords[_sosId] = SOSRecord({
            sosId: _sosId,
            reporterName: _reporterName,
            reporterWallet: _reporterWallet,
            message: _message,
            emergencyType: _emergencyType,
            priority: _priority,
            suspicious: _suspicious,
            status: "pending",
            volunteerName: "",
            volunteerWallet: address(0),
            assignedBy: "",
            volunteerNote: "",
            volunteerReportedStatus: "",
            finalizedBy: "",
            adminNote: "",
            createdAt: block.timestamp,
            assignedAt: 0,
            volunteerReportedAt: 0,
            completedAt: 0,
            rewardPaidWei: 0,
            rewardPaidAt: 0
        });

        sosExists[_sosId] = true;

        emit SOSCreated(
            _sosId,
            _reporterName,
            _reporterWallet,
            _emergencyType,
            _priority,
            block.timestamp
        );
    }

    function assignVolunteer(
        uint256 _sosId,
        string memory _volunteerName,
        string memory _assignedBy,
        address _volunteerWallet
    ) external onlyOwner {
        if (!sosExists[_sosId]) {
            revert SOSNotFound();
        }

        SOSRecord storage record = sosRecords[_sosId];
        if (record.completedAt != 0) {
            revert SOSAlreadyFinalized();
        }

        record.status = "assigned";
        record.volunteerName = _volunteerName;
        record.volunteerWallet = _volunteerWallet;
        record.assignedBy = _assignedBy;
        record.assignedAt = block.timestamp;

        emit VolunteerAssigned(
            _sosId,
            _volunteerWallet,
            _volunteerName,
            _assignedBy,
            block.timestamp
        );
    }

    function volunteerReportSOS(
        uint256 _sosId,
        string memory _status,
        string memory _volunteerNote
    ) external onlyOwner {
        if (!sosExists[_sosId]) {
            revert SOSNotFound();
        }

        SOSRecord storage record = sosRecords[_sosId];
        if (record.volunteerWallet == address(0)) {
            revert VolunteerNotAssigned();
        }
        if (record.completedAt != 0) {
            revert SOSAlreadyFinalized();
        }

        bytes32 normalized = keccak256(bytes(_status));
        if (
            normalized != keccak256(bytes("completed")) &&
            normalized != keccak256(bytes("fake"))
        ) {
            revert InvalidStatus();
        }

        record.status = normalized == keccak256(bytes("completed"))
            ? "volunteer_completed"
            : "volunteer_fake";
        record.volunteerReportedStatus = _status;
        record.volunteerNote = _volunteerNote;
        record.volunteerReportedAt = block.timestamp;

        emit VolunteerReported(
            _sosId,
            record.volunteerWallet,
            _status,
            _volunteerNote,
            block.timestamp
        );
    }

    function finalizeSOS(
        uint256 _sosId,
        string memory _finalStatus,
        string memory _finalizedBy,
        string memory _adminNote
    ) external payable onlyOwner {
        if (!sosExists[_sosId]) {
            revert SOSNotFound();
        }

        SOSRecord storage record = sosRecords[_sosId];
        if (record.volunteerWallet == address(0)) {
            revert VolunteerNotAssigned();
        }
        if (record.volunteerReportedAt == 0) {
            revert VolunteerNotReported();
        }
        if (record.completedAt != 0) {
            revert SOSAlreadyFinalized();
        }

        bytes32 normalized = keccak256(bytes(_finalStatus));
        bytes32 volunteerReported = keccak256(bytes(record.volunteerReportedStatus));
        if (
            normalized != keccak256(bytes("completed")) &&
            normalized != keccak256(bytes("fake")) &&
            normalized != keccak256(bytes("disputed"))
        ) {
            revert InvalidStatus();
        }

        if (normalized == keccak256(bytes("completed"))) {
            if (volunteerReported != keccak256(bytes("completed"))) {
                revert MismatchedFinalStatus();
            }
            if (msg.value != rewardAmount) {
                revert InvalidRewardAmount();
            }

            (bool success, ) = payable(record.volunteerWallet).call{
                value: rewardAmount
            }("");
            if (!success) {
                revert RewardTransferFailed();
            }

            record.rewardPaidWei = rewardAmount;
            record.rewardPaidAt = block.timestamp;
            reputation[record.volunteerWallet] += 1;
        } else if (normalized == keccak256(bytes("fake"))) {
            if (volunteerReported != keccak256(bytes("fake"))) {
                revert MismatchedFinalStatus();
            }
            if (msg.value != 0) {
                revert InvalidRewardAmount();
            }
            reputation[record.volunteerWallet] -= 1;
        } else {
            if (msg.value != 0) {
                revert InvalidRewardAmount();
            }
        }

        record.status = _finalStatus;
        record.finalizedBy = _finalizedBy;
        record.adminNote = _adminNote;
        record.completedAt = block.timestamp;

        emit SOSFinalized(
            _sosId,
            record.volunteerWallet,
            _finalStatus,
            _finalizedBy,
            reputation[record.volunteerWallet],
            record.rewardPaidWei,
            block.timestamp
        );
    }

    function updateRewardAmount(uint256 _newAmount) external onlyOwner {
        uint256 oldAmount = rewardAmount;
        rewardAmount = _newAmount;
        emit RewardAmountUpdated(oldAmount, _newAmount);
    }

    function getSOS(uint256 _sosId) external view returns (SOSRecord memory) {
        if (!sosExists[_sosId]) {
            revert SOSNotFound();
        }

        return sosRecords[_sosId];
    }

    function getReputation(address user) external view returns (int256) {
        return reputation[user];
    }
}
