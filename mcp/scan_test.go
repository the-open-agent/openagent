package mcp

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSanitizePorts(t *testing.T) {
	def := []int{80, 8080}

	if got := sanitizePorts(nil, def); len(got) != 2 || got[0] != 80 || got[1] != 8080 {
		t.Fatalf("sanitizePorts(nil)=%v, want %v", got, def)
	}

	got := sanitizePorts([]string{" 443 ", "443", "0", "65536", "not-a-port", "11434"}, def)
	if len(got) != 2 {
		t.Fatalf("sanitizePorts(inputs)=%v, want 2 ports", got)
	}
	// Order follows first-seen valid ports.
	if got[0] != 443 || got[1] != 11434 {
		t.Fatalf("sanitizePorts(inputs)=%v, want [443 11434]", got)
	}
}

func TestSanitizePaths(t *testing.T) {
	def := []string{"/", "/mcp"}

	if got := sanitizePaths(nil, def); strings.Join(got, ",") != strings.Join(def, ",") {
		t.Fatalf("sanitizePaths(nil)=%v, want %v", got, def)
	}

	got := sanitizePaths([]string{"mcp", "/mcp", " /sse ", "", "mcp/sse"}, def)
	if len(got) != 3 {
		t.Fatalf("sanitizePaths(inputs)=%v, want 3 unique paths", got)
	}
	if got[0] != "/mcp" || got[1] != "/sse" || got[2] != "/mcp/sse" {
		t.Fatalf("sanitizePaths(inputs)=%v, want [/mcp /sse /mcp/sse]", got)
	}
}

func TestParseScanTargets_RejectPublicIP(t *testing.T) {
	_, err := parseScanTargets([]string{"8.8.8.8"}, 32)
	if err == nil {
		t.Fatalf("expected error for public IP, got nil")
	}
}

func TestParseScanTargets_AcceptsLoopbackIP(t *testing.T) {
	hosts, err := parseScanTargets([]string{"127.0.0.1"}, 32)
	if err != nil {
		t.Fatalf("parseScanTargets() error: %v", err)
	}
	if len(hosts) != 1 || hosts[0].String() != "127.0.0.1" {
		t.Fatalf("hosts=%v, want [127.0.0.1]", hosts)
	}
}

func TestProbeMcpEndpoint_404IsNotEndpoint(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	u := strings.TrimPrefix(srv.URL, "http://")
	host, portStr, err := net.SplitHostPort(u)
	if err != nil {
		t.Fatalf("SplitHostPort(%q) error: %v", u, err)
	}
	port, err := net.LookupPort("tcp", portStr)
	if err != nil {
		t.Fatalf("LookupPort(%q) error: %v", portStr, err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	httpClient := &http.Client{Timeout: time.Second}

	if _, ok := probeMcpEndpoint(ctx, httpClient, host, port, "/mcp"); ok {
		t.Fatalf("expected ok=false for 404")
	}
}

func TestProbeMcpEndpoint_Non404IsDetected(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusMethodNotAllowed)
	}))
	defer srv.Close()

	u := strings.TrimPrefix(srv.URL, "http://")
	host, portStr, err := net.SplitHostPort(u)
	if err != nil {
		t.Fatalf("SplitHostPort(%q) error: %v", u, err)
	}
	port, err := net.LookupPort("tcp", portStr)
	if err != nil {
		t.Fatalf("LookupPort(%q) error: %v", portStr, err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	httpClient := &http.Client{Timeout: time.Second}

	s, ok := probeMcpEndpoint(ctx, httpClient, host, port, "/mcp/sse")
	if !ok || s == nil {
		t.Fatalf("expected ok=true with server info, got ok=%v s=%v", ok, s)
	}
	if s.Host != host || s.Port != port || s.Path != "/mcp/sse" {
		t.Fatalf("server=%+v, want host=%q port=%d path=/mcp/sse", s, host, port)
	}
}

