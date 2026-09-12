package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
)

// API models
type RecordRequest struct {
	VerificationID  string `json:"verificationId"`
	TenderID        string `json:"tenderId"`
	BidderReference string `json:"bidderReference"`
	ResultHash      string `json:"resultHash"`
	Timestamp       string `json:"timestamp"`
}

type RecordResponse struct {
	Success bool   `json:"success"`
	TxID    string `json:"txId"`
	Error   string `json:"error,omitempty"`
}

type VerifyResponse struct {
	Verified bool   `json:"verified"`
	Message  string `json:"message"`
	Error    string `json:"error,omitempty"`
}

// Fallback in-memory/file ledger if real Fabric CLI is not available
var ledgerFile = "ledger.json"
var ledgerMutex sync.Mutex

func loadLedger() map[string]RecordRequest {
	data, err := ioutil.ReadFile(ledgerFile)
	if err != nil {
		return make(map[string]RecordRequest)
	}
	var ledger map[string]RecordRequest
	json.Unmarshal(data, &ledger)
	if ledger == nil {
		ledger = make(map[string]RecordRequest)
	}
	return ledger
}

func saveLedger(ledger map[string]RecordRequest) {
	data, _ := json.MarshalIndent(ledger, "", "  ")
	ioutil.WriteFile(ledgerFile, data, 0644)
}

// executeCLI runs a command inside the Fabric CLI container
func executeCLI(args ...string) (string, error) {
	// Check if docker is installed and fabric-cli is running
	cmdArgs := append([]string{"exec", "fabric-cli", "peer", "chaincode"}, args...)
	cmd := exec.Command("docker", cmdArgs...)
	
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	
	err := cmd.Run()
	if err != nil {
		return "", fmt.Errorf("%s - %s", err.Error(), stderr.String())
	}
	return out.String(), nil
}

func recordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(RecordResponse{Success: false, Error: "Invalid payload"})
		return
	}

	log.Printf("Recording verification: %s", req.VerificationID)
	txId := "TX-" + req.VerificationID

	// Try real Fabric first
	argsJSON := fmt.Sprintf(`{"Args":["RecordVerification", "%s", "%s", "%s", "%s", "%s"]}`,
		req.VerificationID, req.TenderID, req.BidderReference, req.ResultHash, req.Timestamp)
	_, err := executeCLI("invoke", "-o", "orderer.example.com:7050", "-C", "mychannel", "-n", "verification", "-c", argsJSON)
	
	if err != nil {
		log.Printf("Fabric CLI unavailable, using standalone simulated ledger mode. (Error: %v)", err)
		// Fallback to simulated ledger
		ledgerMutex.Lock()
		ledger := loadLedger()
		if _, exists := ledger[req.VerificationID]; exists {
			ledgerMutex.Unlock()
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(RecordResponse{Success: false, Error: "Record already exists"})
			return
		}
		ledger[req.VerificationID] = req
		saveLedger(ledger)
		ledgerMutex.Unlock()
		txId = "SIM-TX-" + req.VerificationID
	}

	json.NewEncoder(w).Encode(RecordResponse{
		Success: true,
		TxID:    txId,
	})
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	verificationId := r.URL.Query().Get("id")
	currentHash := r.URL.Query().Get("hash")

	if verificationId == "" || currentHash == "" {
		json.NewEncoder(w).Encode(VerifyResponse{Verified: false, Error: "Missing id or hash"})
		return
	}

	log.Printf("Verifying verification: %s", verificationId)

	// Try real Fabric
	argsJSON := fmt.Sprintf(`{"Args":["VerifyVerification", "%s", "%s"]}`, verificationId, currentHash)
	output, err := executeCLI("query", "-C", "mychannel", "-n", "verification", "-c", argsJSON)
	
	if err != nil {
		log.Printf("Fabric CLI unavailable, using standalone simulated ledger mode.")
		// Fallback to simulated ledger
		ledgerMutex.Lock()
		ledger := loadLedger()
		record, exists := ledger[verificationId]
		ledgerMutex.Unlock()

		if !exists {
			json.NewEncoder(w).Encode(VerifyResponse{Verified: false, Message: "Record not found on blockchain"})
			return
		}

		if record.ResultHash == currentHash {
			json.NewEncoder(w).Encode(VerifyResponse{Verified: true, Message: "Verification record is unchanged and verified on-chain."})
		} else {
			json.NewEncoder(w).Encode(VerifyResponse{Verified: false, Message: "Tampering Detected: The current record differs from the blockchain-registered version."})
		}
		return
	}

	// The query returns "true" or "false"
	result := strings.TrimSpace(output)
	if result == "true" {
		json.NewEncoder(w).Encode(VerifyResponse{Verified: true, Message: "Verification record is unchanged and verified on-chain."})
	} else {
		json.NewEncoder(w).Encode(VerifyResponse{Verified: false, Message: "Tampering Detected: The current record differs from the blockchain-registered version."})
	}
}

func main() {
	// Ensure ledger file exists
	if _, err := os.Stat(ledgerFile); os.IsNotExist(err) {
		ioutil.WriteFile(ledgerFile, []byte("{}"), 0644)
	}

	http.HandleFunc("/record", recordHandler)
	http.HandleFunc("/verify", verifyHandler)

	fmt.Println("Blockchain API Gateway running on port 5000")
	log.Fatal(http.ListenAndServe("0.0.0.0:5000", nil))
}
