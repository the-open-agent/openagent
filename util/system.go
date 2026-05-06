// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

package util

import (
	"bufio"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/disk"
	"github.com/shirou/gopsutil/mem"
	"github.com/shirou/gopsutil/process"
)

type SystemInfo struct {
	CpuUsage     []float64       `json:"cpuUsage"`
	MemoryUsed   uint64          `json:"memoryUsed"`
	MemoryTotal  uint64          `json:"memoryTotal"`
	DiskUsed     uint64          `json:"diskUsed"`
	DiskTotal    uint64          `json:"diskTotal"`
	DiskUsages   []DiskUsageInfo `json:"diskUsages"`
	NetworkSent  uint64          `json:"networkSent"`
	NetworkRecv  uint64          `json:"networkRecv"`
	NetworkTotal uint64          `json:"networkTotal"`
}

type DiskUsageInfo struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
}

type VersionInfo struct {
	Version      string `json:"version"`
	CommitId     string `json:"commitId"`
	CommitOffset int    `json:"commitOffset"`
}

// getCpuUsage get cpu usage
func getCpuUsage() ([]float64, error) {
	usage, err := cpu.Percent(time.Second, true)
	return usage, err
}

// getMemoryUsage get memory usage
func getMemoryUsage() (uint64, uint64, error) {
	virtualMem, err := mem.VirtualMemory()
	if err != nil {
		return 0, 0, err
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	proc, err := process.NewProcess(int32(os.Getpid()))
	if err != nil {
		return 0, 0, err
	}

	memInfo, err := proc.MemoryInfo()
	if err != nil {
		return 0, 0, err
	}

	return memInfo.RSS, virtualMem.Total, nil
}

// getDiskUsage gets disk usage for OpenAgent's data directory
func getDiskUsage() (uint64, uint64, error) {
	// Get the root path of the project
	_, filename, _, _ := runtime.Caller(0)
	rootPath := path.Dir(path.Dir(filename))
	dataPath := filepath.Join(rootPath, "data")

	// Calculate directory size recursively
	var size uint64
	err := filepath.Walk(dataPath, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			// If data directory doesn't exist, return 0 size
			return nil
		}
		if !info.IsDir() {
			size += uint64(info.Size())
		}
		return nil
	})
	if err != nil {
		return 0, 0, err
	}

	// Get the disk total from the filesystem where data directory resides
	diskStat, err := disk.Usage(dataPath)
	if err != nil {
		// Fallback to root if data directory doesn't exist
		diskStat, err = disk.Usage("/")
		if err != nil {
			return 0, 0, err
		}
	}

	return size, diskStat.Total, nil
}

func GetDiskUsages() ([]DiskUsageInfo, error) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, err
	}

	res := []DiskUsageInfo{}
	seen := map[string]bool{}
	for _, partition := range partitions {
		mountpoint := strings.TrimSpace(partition.Mountpoint)
		if mountpoint == "" || seen[mountpoint] {
			continue
		}
		seen[mountpoint] = true

		usage, err := disk.Usage(mountpoint)
		if err != nil {
			continue
		}

		fstype := partition.Fstype
		if fstype == "" {
			fstype = usage.Fstype
		}
		res = append(res, DiskUsageInfo{
			Device:      partition.Device,
			Mountpoint:  mountpoint,
			Fstype:      fstype,
			Total:       usage.Total,
			Used:        usage.Used,
			Free:        usage.Free,
			UsedPercent: usage.UsedPercent,
		})
	}

	if len(res) > 0 {
		return res, nil
	}

	fallbackPath := os.TempDir()
	usage, err := disk.Usage(fallbackPath)
	if err != nil {
		return nil, err
	}

	return []DiskUsageInfo{{
		Mountpoint:  usage.Path,
		Fstype:      usage.Fstype,
		Total:       usage.Total,
		Used:        usage.Used,
		Free:        usage.Free,
		UsedPercent: usage.UsedPercent,
	}}, nil
}

// getNetworkUsage gets OpenAgent process's own network I/O usage
func getNetworkUsage() (uint64, uint64, uint64, error) {
	proc, err := process.NewProcess(int32(os.Getpid()))
	if err != nil {
		return 0, 0, 0, err
	}

	// Try to get process-specific network I/O counters
	netCounters, err := proc.NetIOCounters(false)
	if err != nil || len(netCounters) == 0 {
		// NetIOCounters may not be available on all platforms
		// Fall back to process disk I/O as a proxy for I/O activity
		ioCounters, err := proc.IOCounters()
		if err != nil {
			return 0, 0, 0, err
		}
		bytesSent := ioCounters.WriteBytes
		bytesRecv := ioCounters.ReadBytes
		bytesTotal := bytesSent + bytesRecv
		return bytesSent, bytesRecv, bytesTotal, nil
	}

	// Aggregate network I/O across all interfaces
	var bytesSent, bytesRecv uint64
	for _, counter := range netCounters {
		bytesSent += counter.BytesSent
		bytesRecv += counter.BytesRecv
	}
	bytesTotal := bytesSent + bytesRecv

	return bytesSent, bytesRecv, bytesTotal, nil
}

func GetSystemInfo() (*SystemInfo, error) {
	cpuUsage, err := getCpuUsage()
	if err != nil {
		return nil, err
	}

	memoryUsed, memoryTotal, err := getMemoryUsage()
	if err != nil {
		return nil, err
	}

	diskUsed, diskTotal, err := getDiskUsage()
	if err != nil {
		return nil, err
	}

	diskUsages, _ := GetDiskUsages()

	networkSent, networkRecv, networkTotal, err := getNetworkUsage()
	if err != nil {
		return nil, err
	}

	res := &SystemInfo{
		CpuUsage:     cpuUsage,
		MemoryUsed:   memoryUsed,
		MemoryTotal:  memoryTotal,
		DiskUsed:     diskUsed,
		DiskTotal:    diskTotal,
		DiskUsages:   diskUsages,
		NetworkSent:  networkSent,
		NetworkRecv:  networkRecv,
		NetworkTotal: networkTotal,
	}
	return res, nil
}

// GetVersionInfo get git current commit and repo release version
func GetVersionInfo() (*VersionInfo, error) {
	res := &VersionInfo{
		Version:      "",
		CommitId:     "",
		CommitOffset: -1,
	}

	_, filename, _, _ := runtime.Caller(0)
	rootPath := path.Dir(path.Dir(filename))
	r, err := git.PlainOpen(rootPath)
	if err != nil {
		return res, err
	}
	ref, err := r.Head()
	if err != nil {
		return res, err
	}
	tags, err := r.Tags()
	if err != nil {
		return res, err
	}
	tagMap := make(map[plumbing.Hash]string)
	err = tags.ForEach(func(t *plumbing.Reference) error {
		// This technique should work for both lightweight and annotated tags.
		revHash, err := r.ResolveRevision(plumbing.Revision(t.Name()))
		if err != nil {
			return err
		}
		tagMap[*revHash] = t.Name().Short()
		return nil
	})
	if err != nil {
		return res, err
	}

	cIter, err := r.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		return res, err
	}

	commitOffset := 0
	version := ""
	// iterates over the commits
	err = cIter.ForEach(func(c *object.Commit) error {
		tag, ok := tagMap[c.Hash]
		if ok {
			if version == "" {
				version = tag
			}
		}
		if version == "" {
			commitOffset++
		}
		return nil
	})
	if err != nil {
		return res, err
	}

	res = &VersionInfo{
		Version:      version,
		CommitId:     ref.Hash().String(),
		CommitOffset: commitOffset,
	}
	return res, nil
}

func GetVersionInfoFromFile() (*VersionInfo, error) {
	res := &VersionInfo{
		Version:      "",
		CommitId:     "",
		CommitOffset: -1,
	}

	_, filename, _, _ := runtime.Caller(0)
	rootPath := path.Dir(path.Dir(filename))
	file, err := os.Open(filepath.Clean(path.Join(rootPath, "version_info.txt")))
	if err != nil {
		return res, err
	}
	defer file.Close()

	// Read file contents line by line
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		// Use regular expressions to match strings
		re := regexp.MustCompile(`\{([^{}]+)\}`)
		versionInfo := scanner.Text()
		matches := re.FindStringSubmatch(versionInfo)
		if len(matches) > 1 {
			split := strings.Split(matches[1], " ")
			version := split[0]
			commitId := split[1]
			commitOffset, _ := strconv.Atoi(split[2])
			res = &VersionInfo{
				Version:      version,
				CommitId:     commitId,
				CommitOffset: commitOffset,
			}
			break
		}
	}

	if err := scanner.Err(); err != nil {
		return res, err
	}

	return res, nil
}
