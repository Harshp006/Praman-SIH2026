package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a Verification
type SmartContract struct {
	contractapi.Contract
}

// Verification represents a finalized bidder compliance check
type Verification struct {
	VerificationID  string `json:"verificationId"`
	TenderID        string `json:"tenderId"`
	BidderReference string `json:"bidderReference"`
	ResultHash      string `json:"resultHash"`
	Timestamp       string `json:"timestamp"`
}

// RecordVerification issues a new verification on the ledger
func (s *SmartContract) RecordVerification(ctx contractapi.TransactionContextInterface, verificationId string, tenderId string, bidderRef string, resultHash string, timestamp string) error {
	exists, err := s.VerificationExists(ctx, verificationId)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the verification %s already exists", verificationId)
	}

	verification := Verification{
		VerificationID:  verificationId,
		TenderID:        tenderId,
		BidderReference: bidderRef,
		ResultHash:      resultHash,
		Timestamp:       timestamp,
	}

	verificationJSON, err := json.Marshal(verification)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(verificationId, verificationJSON)
}

// GetVerification returns the verification stored in the world state with given id
func (s *SmartContract) GetVerification(ctx contractapi.TransactionContextInterface, verificationId string) (*Verification, error) {
	verificationJSON, err := ctx.GetStub().GetState(verificationId)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if verificationJSON == nil {
		return nil, fmt.Errorf("the verification %s does not exist", verificationId)
	}

	var verification Verification
	err = json.Unmarshal(verificationJSON, &verification)
	if err != nil {
		return nil, err
	}

	return &verification, nil
}

// VerifyVerification compares the provided hash with the stored hash
func (s *SmartContract) VerifyVerification(ctx contractapi.TransactionContextInterface, verificationId string, currentHash string) (bool, error) {
	verification, err := s.GetVerification(ctx, verificationId)
	if err != nil {
		return false, err
	}

	return verification.ResultHash == currentHash, nil
}

// VerificationExists returns true when verification with given ID exists in world state
func (s *SmartContract) VerificationExists(ctx contractapi.TransactionContextInterface, verificationId string) (bool, error) {
	verificationJSON, err := ctx.GetStub().GetState(verificationId)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return verificationJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))
	if err != nil {
		fmt.Printf("Error create verification chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting verification chaincode: %s", err.Error())
	}
}
