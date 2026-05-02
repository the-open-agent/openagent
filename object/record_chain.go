// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package object

import (
	"fmt"
	"net"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/logs"
	"github.com/robfig/cron/v3"
	"github.com/the-open-agent/openagent/chain"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/util"
)

type Param struct {
	Key   string `json:"key"`
	Field string `json:"field"`
	Value string `json:"value"`
}

// Global variables for commit task
var (
	scanNeedCommitRecordsMutex sync.Mutex
)

func (record *Record) getRecordProvider(chainProvider string, lang string) (*Provider, error) {
	if chainProvider != "" {
		provider, err := getProvider("admin", chainProvider)
		if err != nil {
			return nil, err
		}

		if provider == nil {
			return nil, fmt.Errorf(i18n.Translate(lang, "object:the blockchain provider: %s is not found"), chainProvider)
		}

		return provider, nil
	}

	provider, err := GetActiveBlockchainProvider("admin")
	if err != nil {
		return nil, err
	}

	return provider, nil
}

func (record *Record) getRecordChainClient(chainProvider string, lang string) (chain.ChainClientInterface, *Provider, error) {
	provider, err := record.getRecordProvider(chainProvider, lang)
	if err != nil {
		return nil, nil, err
	}
	if provider == nil {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:there is no active blockchain provider"))
	}

	client, err := chain.NewChainClient(provider.Type, provider.ClientId, provider.ClientSecret, provider.Region, provider.Network, provider.Chain, provider.ProviderUrl, provider.Text, provider.UserKey, provider.UserCert, provider.SignKey, provider.SignCert, provider.ContractName, provider.ContractMethod, lang)
	if err != nil {
		return nil, nil, err
	}

	return client, provider, nil
}

func (record *Record) toMap() map[string]string {
	result := map[string]string{}

	result["id"] = fmt.Sprintf("%d", record.Id)
	result["owner"] = record.Owner
	result["name"] = record.Name
	result["createdTime"] = record.CreatedTime

	result["organization"] = record.Organization
	result["clientIp"] = record.ClientIp
	result["user"] = record.User
	result["method"] = record.Method
	result["requestUri"] = record.RequestUri
	result["action"] = record.Action
	result["language"] = record.Language

	result["object"] = record.Object
	result["response"] = record.Response

	result["provider"] = record.Provider
	result["block"] = record.Block
	result["isTriggered"] = fmt.Sprintf("%t", record.IsTriggered)

	return result
}

func (record *Record) toParam() string {
	record2 := *record
	record2.Provider = ""
	record2.Block = ""
	record2.Transaction = ""
	record2.BlockHash = ""
	record2.Provider2 = ""
	record2.Block2 = ""
	record2.Transaction2 = ""
	record2.BlockHash2 = ""

	res := Param{
		Key:   record2.getId(),
		Field: "Record",
		Value: util.StructToJson(record2),
	}
	return util.StructToJson(res)
}

func CommitRecord(record *Record, lang string) (bool, map[string]interface{}, error) {
	if record.Block != "" {
		return false, nil, fmt.Errorf(i18n.Translate(lang, "object:the record: %s has already been committed, blockId = %s"), record.getUniqueId(), record.Block)
	}

	client, provider, err := record.getRecordChainClient(record.Provider, lang)
	if err != nil {
		_, updateErr := record.updateErrorText(err.Error(), lang)
		if updateErr != nil {
			err = updateErr
		}
		return false, nil, err
	}
	record.Provider = provider.Name

	blockId, transactionId, blockHash, err := client.Commit(record.toParam(), lang)
	if err != nil {
		_, updateErr := record.updateErrorText(err.Error(), lang)
		if updateErr != nil {
			err = updateErr
		}
		return false, nil, err
	}

	data := map[string]interface{}{
		"provider":    record.Provider,
		"block":       blockId,
		"transaction": transactionId,
		"block_hash":  blockHash,
	}

	if record.ErrorText != "" {
		data["error_text"] = ""
	}

	// Update the record fields to avoid concurrent update race conditions
	var affected bool
	if record.Id == 0 {
		// If the record ID is 0, it means batch insert, so using getId()
		affected, err = UpdateRecordFields(record.getId(), data, lang)
	} else {
		affected, err = UpdateRecordFields(record.getUniqueId(), data, lang)
	}

	delete(data, "error_text")

	// attach the name to the data for consistency
	data["name"] = record.Name

	return affected, data, err
}

func CommitRecordSecond(record *Record, lang string) (bool, error) {
	if record.Block2 != "" {
		return false, fmt.Errorf(i18n.Translate(lang, "object:the record: %s has already been committed, blockId = %s"), record.getUniqueId(), record.Block2)
	}

	client, provider, err := record.getRecordChainClient(record.Provider2, lang)
	if err != nil {
		return false, err
	}
	record.Provider2 = provider.Name

	blockId, transactionId, blockHash, err := client.Commit(record.toParam(), lang)
	if err != nil {
		return false, err
	}

	data := map[string]interface{}{
		"provider2":    record.Provider2,
		"block2":       blockId,
		"transaction2": transactionId,
		"block_hash2":  blockHash,
	}

	// Update the record fields to avoid concurrent update race conditions
	affected, err := UpdateRecordFields(record.getUniqueId(), data, lang)
	return affected, err
}

// CommitRecords commits multiple records to the blockchain.
func CommitRecords(records []*Record, lang string) (int, []map[string]interface{}) {
	if len(records) == 0 {
		return 0, nil
	}

	var data []map[string]interface{}
	affected := 0
	// Lock the mutex to prevent concurrent
	scanNeedCommitRecordsMutex.Lock()
	defer scanNeedCommitRecordsMutex.Unlock()

	for _, record := range records {
		// Get the record from the database to ensure it is up-to-date
		record, err := GetRecord(record.getId(), lang)
		if err != nil {
			data = append(data, map[string]interface{}{
				"name":       record.Name,
				"error_text": err.Error(),
			})
			continue
		}
		if record.Block != "" {
			data = append(data, map[string]interface{}{
				"name":        record.Name,
				"provider":    record.Provider,
				"block":       record.Block,
				"transaction": record.Transaction,
				"block_hash":  record.BlockHash,
			})
			continue
		}

		recordAffected, commitResult, err := CommitRecord(record, lang)
		if err != nil {
			data = append(data, map[string]interface{}{
				"name":       record.Name,
				"error_text": err.Error(),
			})
		} else {
			if recordAffected {
				affected++
			}
			data = append(data, commitResult)
		}
	}

	return affected, data
}

func QueryRecord(id string, lang string) (string, error) {
	record, err := GetRecord(id, lang)
	if err != nil {
		return "", err
	}
	if record == nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:the record: %s does not exist"), id)
	}

	if record.Block == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:the record: %s's block ID should not be empty"), id)
	}

	client, _, err := record.getRecordChainClient(record.Provider, lang)
	if err != nil {
		return "", err
	}

	res, err := client.Query(record.Transaction, record.toParam(), lang)
	if err != nil {
		return "", err
	}

	return res, nil
}

func QueryRecordSecond(id string, lang string) (string, error) {
	record, err := GetRecord(id, lang)
	if err != nil {
		return "", err
	}
	if record == nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:the record: %s does not exist"), id)
	}

	if record.Block2 == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:the record: %s's block ID should not be empty"), id)
	}

	client, _, err := record.getRecordChainClient(record.Provider2, lang)
	if err != nil {
		return "", err
	}

	res, err := client.Query(record.Transaction2, record.toParam(), lang)
	if err != nil {
		return "", err
	}

	return res, nil
}

func isEndpointReachable(endpoint string) bool {
	if endpoint == "" {
		return false
	}
	if !strings.HasPrefix(endpoint, "http://") && !strings.HasPrefix(endpoint, "https://") {
		endpoint = "http://" + endpoint
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return false
	}
	host := u.Hostname()
	port := u.Port()
	if port == "" {
		if u.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), 3*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// ScanNeedCommitRecords scans the database table for records that
// need to be committed but have not yet been committed.
func ScanNeedCommitRecords() {
	provider, err := GetActiveBlockchainProvider("admin")
	if err != nil {
		logs.Error("ScanNeedCommitRecords() failed to get active blockchain provider: %v", err)
		return
	}
	if provider == nil {
		return
	}
	if provider.ProviderUrl != "" && !isEndpointReachable(provider.ProviderUrl) {
		return
	}

	scanNeedCommitRecordsMutex.Lock()
	defer scanNeedCommitRecordsMutex.Unlock()
	records := []*Record{}
	err = adapter.engine.Where("need_commit = ? AND block = ?", true, "").Asc("id").Find(&records)
	if err != nil {
		logs.Error("ScanNeedCommitRecords() failed to scan records that need to be committed: %v", err)
	}

	if len(records) == 0 {
		return
	}

	var errors []string

	for _, record := range records {
		if _, _, err := CommitRecord(record, "en"); err != nil {
			errors = append(errors, err.Error())
		}
	}

	if len(errors) > 0 {
		logs.Error("ScanNeedCommitRecords() failed to commit %d/%d records: %v", len(errors), len(records), errors)
	}
}

func InitCommitRecordsTask() {
	// Run once immediately on startup
	go ScanNeedCommitRecords()

	// Create cron job
	cronJob := cron.New()
	schedule := "@every 5m"
	_, err := cronJob.AddFunc(schedule, ScanNeedCommitRecords)
	if err != nil {
		panic(err)
	}

	cronJob.Start()
}
