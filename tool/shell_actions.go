// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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

package tool

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	gopsnet "github.com/shirou/gopsutil/net"
	"github.com/shirou/gopsutil/process"
	"github.com/the-open-agent/openagent/util"
)

const (
	shellActionDefaultLimit = 50
	shellActionMaxLimit     = 200
	shellActionMaxReadBytes = 64 * 1024
)

type shellActionResponse struct {
	Success     bool        `json:"success"`
	Action      string      `json:"action"`
	Summary     string      `json:"summary"`
	Data        interface{} `json:"data,omitempty"`
	Command     string      `json:"command,omitempty"`
	OS          string      `json:"os"`
	Arch        string      `json:"arch"`
	Shell       string      `json:"shell,omitempty"`
	ExitCode    *int        `json:"exitCode,omitempty"`
	TimedOut    *bool       `json:"timedOut,omitempty"`
	Stdout      *string     `json:"stdout,omitempty"`
	Stderr      *string     `json:"stderr,omitempty"`
	CollectedAt string      `json:"collectedAt"`
	Error       string      `json:"error,omitempty"`
	Suggestion  string      `json:"suggestion,omitempty"`
}

type shellActionFileEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Type     string `json:"type"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
}

type shellActionTreeEntry struct {
	Path  string `json:"path"`
	Type  string `json:"type"`
	Size  int64  `json:"size,omitempty"`
	Depth int    `json:"depth"`
}

type shellActionPortEntry struct {
	Protocol      string `json:"protocol"`
	LocalAddress  string `json:"localAddress"`
	RemoteAddress string `json:"remoteAddress,omitempty"`
	Status        string `json:"status"`
	PID           int32  `json:"pid,omitempty"`
	ProcessName   string `json:"processName,omitempty"`
}

type shellActionProcessEntry struct {
	PID         int32   `json:"pid"`
	Name        string  `json:"name"`
	Username    string  `json:"username,omitempty"`
	CPUPercent  float64 `json:"cpuPercent,omitempty"`
	MemoryBytes uint64  `json:"memoryBytes,omitempty"`
}

type shellActionEnvEntry struct {
	Name  string `json:"name"`
	Value string `json:"value,omitempty"`
}

type shellActionDirSize struct {
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	FileCount int    `json:"fileCount"`
	DirCount  int    `json:"dirCount"`
	Truncated bool   `json:"truncated"`
}

type shellActionReadFile struct {
	Path      string `json:"path"`
	Size      int64  `json:"size"`
	Content   string `json:"content"`
	Truncated bool   `json:"truncated"`
}

type diskUsageSummary struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
}

func shellExecuteStructuredAction(ctx context.Context, action string, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	action = strings.ToLower(strings.TrimSpace(action))
	switch action {
	case "disk_usage":
		return shellActionToolResponse(shellActionDiskUsage()), nil
	case "list_dir":
		return shellActionToolResponse(shellActionListDir(arguments)), nil
	case "tree":
		return shellActionToolResponse(shellActionTree(arguments)), nil
	case "dir_size":
		return shellActionToolResponse(shellActionDirSizeAction(arguments)), nil
	case "read_file":
		return shellActionToolResponse(shellActionReadFileAction(arguments)), nil
	case "version":
		return shellActionToolResponse(shellActionVersion(ctx, arguments)), nil
	case "port_usage":
		return shellActionToolResponse(shellActionPortUsage(arguments)), nil
	case "processes":
		return shellActionToolResponse(shellActionProcesses(arguments)), nil
	case "env":
		return shellActionToolResponse(shellActionEnv(arguments)), nil
	case "system_info":
		return shellActionToolResponse(shellActionSystemInfo()), nil
	case "network_info":
		return shellActionToolResponse(shellActionNetworkInfo()), nil
	case "docker":
		return shellActionToolResponse(shellActionDocker(ctx, arguments)), nil
	case "mysql":
		return shellActionToolResponse(shellActionMySQL(ctx, arguments)), nil
	case "raw_command":
		return shellActionToolResponse(shellActionRawCommand(ctx, arguments)), nil
	default:
		if command := strings.TrimSpace(getStringArgument(arguments, "command")); command != "" {
			return shellActionToolResponse(shellActionRawCommand(ctx, arguments)), nil
		}
		return shellActionToolResponse(shellActionFailure(action, fmt.Sprintf("不支持的 action: %s", action), "可用 action: raw_command, disk_usage, list_dir, tree, dir_size, read_file, version, port_usage, processes, env, system_info, network_info, docker, mysql。")), nil
	}
}

func shellActionDiskUsage() shellActionResponse {
	disks, err := util.GetDiskUsages()
	if err != nil {
		return shellActionFailure("disk_usage", fmt.Sprintf("获取磁盘空间失败: %s", err.Error()), "确认当前进程有读取磁盘分区信息的权限。")
	}
	hostname, _ := os.Hostname()
	data := map[string]interface{}{
		"hostname": hostname,
		"disks":    disks,
		"summary":  buildDiskUsageSummary(disks),
	}
	return shellActionSuccess("disk_usage", fmt.Sprintf("读取本机磁盘空间，共 %d 个挂载点/分区。", len(disks)), data, "")
}

func buildDiskUsageSummary(disks []util.DiskUsageInfo) diskUsageSummary {
	summary := diskUsageSummary{}
	for _, diskInfo := range disks {
		summary.Total += diskInfo.Total
		summary.Used += diskInfo.Used
		summary.Free += diskInfo.Free
	}
	if summary.Total > 0 {
		summary.UsedPercent = float64(summary.Used) / float64(summary.Total) * 100
	}
	return summary
}

func shellActionListDir(arguments map[string]interface{}) shellActionResponse {
	path := getPathArgument(arguments)
	limit := getLimitArgument(arguments)

	entries, err := os.ReadDir(path)
	if err != nil {
		return shellActionFailure("list_dir", fmt.Sprintf("读取目录失败: %s", err.Error()), "确认路径存在且当前进程有读取权限。")
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir() != entries[j].IsDir() {
			return entries[i].IsDir()
		}
		return strings.ToLower(entries[i].Name()) < strings.ToLower(entries[j].Name())
	})

	result := make([]shellActionFileEntry, 0, minInt(len(entries), limit))
	for i, entry := range entries {
		if i >= limit {
			break
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		entryType := "file"
		if entry.IsDir() {
			entryType = "directory"
		}
		result = append(result, shellActionFileEntry{
			Name:     entry.Name(),
			Path:     filepath.Join(path, entry.Name()),
			Type:     entryType,
			Size:     info.Size(),
			Modified: info.ModTime().Format(time.RFC3339),
		})
	}

	return shellActionSuccess("list_dir", fmt.Sprintf("列出目录 %s，共 %d 项，返回 %d 项。", path, len(entries), len(result)), result, "")
}

func shellActionTree(arguments map[string]interface{}) shellActionResponse {
	root := getPathArgument(arguments)
	limit := getLimitArgument(arguments)
	maxDepth := getNumberArgument(arguments, "max_depth", 2)
	if maxDepth < 1 {
		maxDepth = 1
	}
	if maxDepth > 5 {
		maxDepth = 5
	}

	var result []shellActionTreeEntry
	rootClean := filepath.Clean(root)
	errStop := fmt.Errorf("shell tree limit reached")
	err := filepath.WalkDir(rootClean, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if path == rootClean {
			return nil
		}
		rel, err := filepath.Rel(rootClean, path)
		if err != nil {
			return nil
		}
		depth := len(strings.Split(rel, string(os.PathSeparator)))
		if depth > maxDepth {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if len(result) >= limit {
			return errStop
		}
		entryType := "file"
		size := int64(0)
		if d.IsDir() {
			entryType = "directory"
		} else if info, err := d.Info(); err == nil {
			size = info.Size()
		}
		result = append(result, shellActionTreeEntry{
			Path:  rel,
			Type:  entryType,
			Size:  size,
			Depth: depth,
		})
		return nil
	})
	if err != nil && err != errStop {
		return shellActionFailure("tree", fmt.Sprintf("读取目录树失败: %s", err.Error()), "确认路径存在且当前进程有读取权限。")
	}

	return shellActionSuccess("tree", fmt.Sprintf("读取目录树 %s，最大深度 %d，返回 %d 项。", rootClean, maxDepth, len(result)), result, "")
}

func shellActionDirSizeAction(arguments map[string]interface{}) shellActionResponse {
	root := getPathArgument(arguments)
	maxEntries := 100000
	var result shellActionDirSize
	result.Path = filepath.Clean(root)

	errStop := fmt.Errorf("shell dir size limit reached")
	err := filepath.WalkDir(result.Path, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if path == result.Path {
			return nil
		}
		if result.FileCount+result.DirCount >= maxEntries {
			result.Truncated = true
			return errStop
		}
		if d.IsDir() {
			result.DirCount++
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		result.FileCount++
		result.Size += info.Size()
		return nil
	})
	if err != nil && err != errStop {
		return shellActionFailure("dir_size", fmt.Sprintf("统计目录大小失败: %s", err.Error()), "确认路径存在且当前进程有读取权限。")
	}

	return shellActionSuccess("dir_size", fmt.Sprintf("目录 %s 大小约 %d 字节，文件 %d 个，目录 %d 个。", result.Path, result.Size, result.FileCount, result.DirCount), result, "")
}

func shellActionReadFileAction(arguments map[string]interface{}) shellActionResponse {
	path := strings.TrimSpace(getStringArgument(arguments, "path"))
	if path == "" {
		return shellActionFailure("read_file", "缺少 path 参数。", "提供要读取的配置或日志文件路径。")
	}
	cleanPath := filepath.Clean(path)
	info, err := os.Stat(cleanPath)
	if err != nil {
		return shellActionFailure("read_file", fmt.Sprintf("读取文件信息失败: %s", err.Error()), "确认文件存在且当前进程有读取权限。")
	}
	if info.IsDir() {
		return shellActionFailure("read_file", "path 指向目录，不是文件。", "如需查看目录内容，请使用 list_dir 或 tree。")
	}
	if isSensitiveFilePath(cleanPath) {
		return shellActionFailure("read_file", "已拒绝读取疑似敏感凭据文件。", "避免读取私钥、token、secret、密码文件；只读取明确需要的普通配置或日志。")
	}

	file, err := os.Open(cleanPath)
	if err != nil {
		return shellActionFailure("read_file", fmt.Sprintf("打开文件失败: %s", err.Error()), "确认当前进程有读取权限。")
	}
	defer file.Close()

	limit := shellActionMaxReadBytes
	if lines := getNumberArgument(arguments, "limit", 0); lines > 0 {
		limit = minInt(lines*512, shellActionMaxReadBytes)
	}
	data, err := io.ReadAll(io.LimitReader(file, int64(limit)+1))
	if err != nil {
		return shellActionFailure("read_file", fmt.Sprintf("读取文件失败: %s", err.Error()), "确认文件不是特殊设备文件。")
	}
	truncated := len(data) > limit
	if truncated {
		data = data[:limit]
	}

	text := redactSensitiveText(string(data))
	if lineLimit := getNumberArgument(arguments, "limit", 0); lineLimit > 0 {
		lines := strings.Split(text, "\n")
		if len(lines) > lineLimit {
			text = strings.Join(lines[:lineLimit], "\n")
			truncated = true
		}
	}

	result := shellActionReadFile{
		Path:      cleanPath,
		Size:      info.Size(),
		Content:   text,
		Truncated: truncated,
	}
	return shellActionSuccess("read_file", fmt.Sprintf("读取文件 %s，大小 %d 字节，已返回%s内容。", cleanPath, info.Size(), ternaryString(truncated, "部分", "全部")), result, "")
}

func shellActionVersion(ctx context.Context, arguments map[string]interface{}) shellActionResponse {
	target := strings.ToLower(strings.TrimSpace(getStringArgument(arguments, "target")))
	if target == "" {
		target = "all"
	}

	targets := []string{target}
	if target == "all" {
		targets = []string{"go", "node", "npm", "python", "docker", "mysql"}
	}

	result := map[string]string{}
	commands := map[string][]string{}
	for _, name := range targets {
		spec, ok := shellVersionCommand(name)
		if !ok {
			result[name] = "unsupported target"
			continue
		}
		runResult := runShellCommand(ctx, shellCommandOptions{
			Command:        spec[0],
			Args:           spec[1:],
			Timeout:        5 * time.Second,
			MaxOutputBytes: 4096,
		})
		commands[name] = spec
		output := strings.TrimSpace(runResult.Stdout)
		if output == "" {
			output = strings.TrimSpace(runResult.Stderr)
		}
		if runResult.Err != nil {
			if output == "" {
				output = runResult.Err.Error()
			}
			result[name] = "unavailable: " + output
		} else {
			result[name] = firstLine(output)
		}
	}

	commandText := formatCommandMap(commands)
	return shellActionSuccess("version", fmt.Sprintf("查询版本信息: %s。", strings.Join(targets, ", ")), result, commandText)
}

func shellActionPortUsage(arguments map[string]interface{}) shellActionResponse {
	port := getNumberArgument(arguments, "port", 0)
	limit := getLimitArgument(arguments)

	connections, err := gopsnet.Connections("inet")
	if err != nil {
		return shellActionFailure("port_usage", fmt.Sprintf("查询端口失败: %s", err.Error()), "可尝试使用 system_info 或确认当前进程有网络连接查询权限。")
	}

	var result []shellActionPortEntry
	for _, conn := range connections {
		if port > 0 && int(conn.Laddr.Port) != port && int(conn.Raddr.Port) != port {
			continue
		}
		if port == 0 && strings.ToUpper(conn.Status) != "LISTEN" {
			continue
		}
		entry := shellActionPortEntry{
			Protocol:      fmt.Sprintf("%d", conn.Type),
			LocalAddress:  formatAddr(conn.Laddr.IP, conn.Laddr.Port),
			RemoteAddress: formatAddr(conn.Raddr.IP, conn.Raddr.Port),
			Status:        conn.Status,
			PID:           conn.Pid,
			ProcessName:   processName(conn.Pid),
		}
		result = append(result, entry)
		if len(result) >= limit {
			break
		}
	}

	summary := "查询监听端口"
	if port > 0 {
		summary = fmt.Sprintf("查询端口 %d 占用", port)
	}
	summary = fmt.Sprintf("%s，返回 %d 条记录。", summary, len(result))
	return shellActionSuccess("port_usage", summary, result, "")
}

func shellActionProcesses(arguments map[string]interface{}) shellActionResponse {
	limit := getLimitArgument(arguments)
	processes, err := process.Processes()
	if err != nil {
		return shellActionFailure("processes", fmt.Sprintf("查询进程失败: %s", err.Error()), "确认当前进程有读取进程列表权限。")
	}

	result := make([]shellActionProcessEntry, 0, minInt(len(processes), limit))
	for _, proc := range processes {
		name, _ := proc.Name()
		if name == "" {
			continue
		}
		username, _ := proc.Username()
		cpuPercent, _ := proc.CPUPercent()
		memInfo, _ := proc.MemoryInfo()
		entry := shellActionProcessEntry{
			PID:        proc.Pid,
			Name:       name,
			Username:   username,
			CPUPercent: cpuPercent,
		}
		if memInfo != nil {
			entry.MemoryBytes = memInfo.RSS
		}
		result = append(result, entry)
		if len(result) >= limit {
			break
		}
	}

	return shellActionSuccess("processes", fmt.Sprintf("查询进程列表，返回 %d 条记录。", len(result)), result, "")
}

func shellActionEnv(arguments map[string]interface{}) shellActionResponse {
	target := strings.TrimSpace(getStringArgument(arguments, "target"))
	limit := getLimitArgument(arguments)
	if target != "" {
		value, ok := os.LookupEnv(target)
		if !ok {
			return shellActionSuccess("env", fmt.Sprintf("环境变量 %s 未设置。", target), []shellActionEnvEntry{}, "")
		}
		if isSensitiveEnvName(target) {
			value = "(redacted)"
		}
		return shellActionSuccess("env", fmt.Sprintf("读取环境变量 %s。", target), []shellActionEnvEntry{{Name: target, Value: value}}, "")
	}

	envs := os.Environ()
	sort.Strings(envs)
	result := make([]shellActionEnvEntry, 0, minInt(len(envs), limit))
	for _, env := range envs {
		parts := strings.SplitN(env, "=", 2)
		name := parts[0]
		value := ""
		if len(parts) > 1 {
			value = parts[1]
		}
		if isSensitiveEnvName(name) {
			value = "(redacted)"
		}
		result = append(result, shellActionEnvEntry{Name: name, Value: value})
		if len(result) >= limit {
			break
		}
	}

	return shellActionSuccess("env", fmt.Sprintf("读取环境变量，返回 %d 项，敏感名称已脱敏。", len(result)), result, "")
}

func shellActionSystemInfo() shellActionResponse {
	hostname, _ := os.Hostname()
	cpuCounts, _ := cpu.Counts(true)
	memInfo, _ := mem.VirtualMemory()
	data := map[string]interface{}{
		"os":          runtime.GOOS,
		"arch":        runtime.GOARCH,
		"hostname":    hostname,
		"cpuCount":    cpuCounts,
		"goVersion":   runtime.Version(),
		"memoryTotal": uint64(0),
		"memoryUsed":  uint64(0),
		"memoryFree":  uint64(0),
	}
	if memInfo != nil {
		data["memoryTotal"] = memInfo.Total
		data["memoryUsed"] = memInfo.Used
		data["memoryFree"] = memInfo.Available
		data["memoryUsedPercent"] = memInfo.UsedPercent
	}
	return shellActionSuccess("system_info", "读取系统基本信息。", data, "")
}

func shellActionNetworkInfo() shellActionResponse {
	interfaces, err := gopsnet.Interfaces()
	if err != nil {
		return shellActionFailure("network_info", fmt.Sprintf("读取网络接口失败: %s", err.Error()), "确认当前进程有读取网络接口权限。")
	}

	limit := minInt(len(interfaces), shellActionDefaultLimit)
	data := make([]map[string]interface{}, 0, limit)
	for i, iface := range interfaces {
		if i >= limit {
			break
		}
		data = append(data, map[string]interface{}{
			"name":         iface.Name,
			"hardwareAddr": iface.HardwareAddr,
			"flags":        iface.Flags,
			"addrs":        iface.Addrs,
		})
	}

	return shellActionSuccess("network_info", fmt.Sprintf("读取网络接口信息，返回 %d 项。", len(data)), data, "")
}

func shellActionDocker(ctx context.Context, arguments map[string]interface{}) shellActionResponse {
	target := strings.ToLower(strings.TrimSpace(getStringArgument(arguments, "target")))
	if target == "" {
		target = "version"
	}

	var spec []string
	switch target {
	case "version":
		spec = []string{"docker", "version", "--format", "{{json .}}"}
	case "ps", "containers":
		spec = []string{"docker", "ps", "--format", "{{json .}}"}
	case "images":
		spec = []string{"docker", "images", "--format", "{{json .}}"}
	default:
		return shellActionFailure("docker", fmt.Sprintf("不支持的 Docker target: %s", target), "可用 target: version, ps, containers, images。")
	}

	runResult := runShellCommand(ctx, shellCommandOptions{
		Command:        spec[0],
		Args:           spec[1:],
		Timeout:        10 * time.Second,
		MaxOutputBytes: 16 * 1024,
	})
	output := strings.TrimSpace(runResult.Stdout)
	if output == "" {
		output = strings.TrimSpace(runResult.Stderr)
	}
	if runResult.Err != nil {
		return shellActionFailure("docker", fmt.Sprintf("Docker 查询失败: %s", outputOrError(output, runResult.Err)), "确认 docker 已安装、服务正在运行且当前用户有读取权限。")
	}

	return shellActionSuccess("docker", fmt.Sprintf("执行只读 Docker 查询: %s。", target), linesLimited(output, getLimitArgument(arguments)), strings.Join(spec, " "))
}

func shellActionMySQL(ctx context.Context, arguments map[string]interface{}) shellActionResponse {
	target := strings.ToLower(strings.TrimSpace(getStringArgument(arguments, "target")))
	if target == "" {
		target = "version"
	}

	var spec []string
	switch target {
	case "version", "install", "installed":
		spec = []string{"mysql", "--version"}
	default:
		return shellActionFailure("mysql", fmt.Sprintf("不支持的 MySQL target: %s", target), "当前只支持 version/install/installed，用于检查客户端是否安装。")
	}

	runResult := runShellCommand(ctx, shellCommandOptions{
		Command:        spec[0],
		Args:           spec[1:],
		Timeout:        5 * time.Second,
		MaxOutputBytes: 4096,
	})
	output := strings.TrimSpace(runResult.Stdout)
	if output == "" {
		output = strings.TrimSpace(runResult.Stderr)
	}
	if runResult.Err != nil {
		return shellActionFailure("mysql", fmt.Sprintf("MySQL 查询失败: %s", outputOrError(output, runResult.Err)), "确认 mysql 客户端已安装并在 PATH 中。")
	}

	return shellActionSuccess("mysql", "查询 MySQL 客户端安装/版本信息。", firstLine(output), strings.Join(spec, " "))
}

func shellActionRawCommand(ctx context.Context, arguments map[string]interface{}) shellActionResponse {
	command := strings.TrimSpace(getStringArgument(arguments, "command"))
	if command == "" {
		return shellActionFailure("raw_command", "缺少 command 参数。", "请提供需要执行的 shell 命令。")
	}

	timeoutSecs := getNumberArgument(arguments, "timeout", 30)
	if timeoutSecs <= 0 {
		timeoutSecs = 30
	}
	if timeoutSecs > 300 {
		timeoutSecs = 300
	}

	workdir := strings.TrimSpace(getStringArgument(arguments, "workdir"))
	runResult := runShellCommand(ctx, shellCommandOptions{
		Command:        command,
		UseShell:       true,
		Workdir:        workdir,
		Timeout:        time.Duration(timeoutSecs) * time.Second,
		MaxOutputBytes: 32 * 1024,
	})

	data := map[string]interface{}{
		"stdout":   runResult.Stdout,
		"stderr":   runResult.Stderr,
		"exitCode": runResult.ExitCode,
		"timedOut": runResult.TimedOut,
		"shell":    runResult.Shell,
		"workdir":  workdir,
	}
	stdout := runResult.Stdout
	stderr := runResult.Stderr
	exitCode := runResult.ExitCode
	timedOut := runResult.TimedOut
	if runResult.Err != nil {
		data["error"] = runResult.Err.Error()
		response := shellActionFailure("raw_command", fmt.Sprintf("命令执行失败: %s", runResult.Err.Error()), "检查命令、工作目录和当前进程权限。")
		response.Data = data
		response.Command = command
		response.Shell = runResult.Shell
		response.ExitCode = &exitCode
		response.TimedOut = &timedOut
		response.Stdout = &stdout
		response.Stderr = &stderr
		return response
	}

	response := shellActionSuccess("raw_command", "命令执行完成。", data, command)
	response.Shell = runResult.Shell
	response.ExitCode = &exitCode
	response.TimedOut = &timedOut
	response.Stdout = &stdout
	response.Stderr = &stderr
	return response
}

func shellVersionCommand(target string) ([]string, bool) {
	switch target {
	case "go", "golang":
		return []string{"go", "version"}, true
	case "node", "nodejs":
		return []string{"node", "-v"}, true
	case "npm":
		return []string{"npm", "-v"}, true
	case "python", "python3":
		return []string{"python", "--version"}, true
	case "docker":
		return []string{"docker", "--version"}, true
	case "mysql":
		return []string{"mysql", "--version"}, true
	default:
		return nil, false
	}
}

func shellActionSuccess(action, summary string, data interface{}, command string) shellActionResponse {
	return shellActionResponse{
		Success:     true,
		Action:      action,
		Summary:     summary,
		Data:        data,
		Command:     command,
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		CollectedAt: time.Now().Format(time.RFC3339),
	}
}

func shellActionFailure(action, errorText, suggestion string) shellActionResponse {
	return shellActionResponse{
		Success:     false,
		Action:      action,
		Summary:     "查询失败。",
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		CollectedAt: time.Now().Format(time.RFC3339),
		Error:       errorText,
		Suggestion:  suggestion,
	}
}

func shellActionToolResponse(response shellActionResponse) *protocol.CallToolResult {
	data, err := json.MarshalIndent(response, "", "  ")
	if err != nil {
		return &protocol.CallToolResult{
			IsError: true,
			Content: []protocol.Content{
				&protocol.TextContent{Type: "text", Text: fmt.Sprintf("failed to encode shell response: %s", err.Error())},
			},
		}
	}
	return &protocol.CallToolResult{
		IsError: !response.Success,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: string(data)},
		},
	}
}

func getStringArgument(arguments map[string]interface{}, name string) string {
	value, _ := arguments[name].(string)
	return value
}

func getPathArgument(arguments map[string]interface{}) string {
	path := strings.TrimSpace(getStringArgument(arguments, "path"))
	if path == "" {
		path = "."
	}
	return filepath.Clean(path)
}

func getLimitArgument(arguments map[string]interface{}) int {
	limit := getNumberArgument(arguments, "limit", shellActionDefaultLimit)
	if limit <= 0 {
		limit = shellActionDefaultLimit
	}
	if limit > shellActionMaxLimit {
		limit = shellActionMaxLimit
	}
	return limit
}

func getNumberArgument(arguments map[string]interface{}, name string, defaultValue int) int {
	value, ok := arguments[name]
	if !ok {
		return defaultValue
	}
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case json.Number:
		n, err := typed.Int64()
		if err != nil {
			return defaultValue
		}
		return int(n)
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(typed))
		if err != nil {
			return defaultValue
		}
		return n
	default:
		return defaultValue
	}
}

func isSensitiveFilePath(path string) bool {
	base := strings.ToLower(filepath.Base(path))
	full := strings.ToLower(path)
	keywords := []string{
		"id_rsa",
		"id_dsa",
		"id_ecdsa",
		"id_ed25519",
		".pem",
		".key",
		"secret",
		"token",
		"password",
		"passwd",
		"credential",
	}
	for _, keyword := range keywords {
		if strings.Contains(base, keyword) || strings.Contains(full, string(os.PathSeparator)+keyword) {
			return true
		}
	}
	return false
}

func isSensitiveEnvName(name string) bool {
	upper := strings.ToUpper(name)
	keywords := []string{"KEY", "SECRET", "TOKEN", "PASSWORD", "PASSWD", "CREDENTIAL", "COOKIE"}
	for _, keyword := range keywords {
		if strings.Contains(upper, keyword) {
			return true
		}
	}
	return false
}

func redactSensitiveText(text string) string {
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		separatorIndex := strings.IndexAny(trimmed, "=:")
		if separatorIndex <= 0 {
			continue
		}
		key := strings.TrimSpace(trimmed[:separatorIndex])
		if !isSensitiveEnvName(key) {
			continue
		}
		prefix := line[:strings.Index(line, key)+len(key)]
		separator := trimmed[separatorIndex : separatorIndex+1]
		lines[i] = prefix + separator + " (redacted)"
	}
	return strings.Join(lines, "\n")
}

func processName(pid int32) string {
	if pid <= 0 {
		return ""
	}
	proc, err := process.NewProcess(pid)
	if err != nil {
		return ""
	}
	name, _ := proc.Name()
	return name
}

func formatAddr(ip string, port uint32) string {
	if ip == "" && port == 0 {
		return ""
	}
	return fmt.Sprintf("%s:%d", ip, port)
}

func firstLine(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	lines := strings.Split(text, "\n")
	return strings.TrimSpace(lines[0])
}

func linesLimited(text string, limit int) []string {
	if text == "" {
		return []string{}
	}
	lines := strings.Split(text, "\n")
	if len(lines) > limit {
		lines = lines[:limit]
	}
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], "\r")
	}
	return lines
}

func formatCommandMap(commands map[string][]string) string {
	keys := make([]string, 0, len(commands))
	for key := range commands {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s: %s", key, strings.Join(commands[key], " ")))
	}
	return strings.Join(parts, "; ")
}

func outputOrError(output string, err error) string {
	if strings.TrimSpace(output) != "" {
		return output
	}
	if err != nil {
		return err.Error()
	}
	return ""
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func ternaryString(condition bool, trueValue, falseValue string) string {
	if condition {
		return trueValue
	}
	return falseValue
}
