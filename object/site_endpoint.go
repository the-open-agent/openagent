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

package object

import (
	"net"
	"net/http"
	"net/url"
)

// siteEndpointNeedsAutoFill is true while site-built-in's Endpoint is empty or
// non-public. Set at startup by InitSiteEndpoint and kept in sync by UpdateSite.
var siteEndpointNeedsAutoFill bool

// isPublicHost reports whether rawHost (which may include a port) is a
// routable public address: not loopback, RFC-1918, link-local, or unspecified.
func isPublicHost(rawHost string) bool {
	host, _, err := net.SplitHostPort(rawHost)
	if err != nil {
		host = rawHost // no port present
	}
	if host == "" || host == "localhost" {
		return false
	}
	ip := net.ParseIP(host)
	if ip == nil {
		// A non-empty hostname that isn't an IP literal is assumed public
		// (e.g. try.openagentai.org).
		return true
	}
	return !ip.IsLoopback() && !ip.IsPrivate() && !ip.IsLinkLocalUnicast() && !ip.IsUnspecified()
}

// isPublicEndpoint reports whether endpoint is a non-empty URL whose host is public.
func isPublicEndpoint(endpoint string) bool {
	if endpoint == "" {
		return false
	}
	u, err := url.Parse(endpoint)
	if err != nil {
		return false
	}
	return isPublicHost(u.Host)
}

// InitSiteEndpoint reads site-built-in from the DB and initialises
// siteEndpointNeedsAutoFill. Call once at startup after the adapter is ready.
func InitSiteEndpoint() {
	site, err := GetBuiltInSiteWithSecret()
	if err != nil || site == nil {
		return
	}
	siteEndpointNeedsAutoFill = !isPublicEndpoint(site.Endpoint)
}

// AutoFillSiteEndpoint fills site-built-in's Endpoint from the request host
// when the stored value is empty or non-public. It is a no-op once a public
// endpoint has been saved, and also skips non-public request hosts (localhost,
// private IPs, etc.) so that only real public addresses are ever stored.
func AutoFillSiteEndpoint(req *http.Request) {
	if !siteEndpointNeedsAutoFill {
		return
	}

	// Ignore non-public request hosts (e.g. localhost, 192.168.x.x).
	if !isPublicHost(req.Host) {
		return
	}

	site, err := GetBuiltInSiteWithSecret()
	if err != nil || site == nil {
		return
	}
	if isPublicEndpoint(site.Endpoint) {
		// Someone already set a public endpoint via the admin UI.
		siteEndpointNeedsAutoFill = false
		return
	}

	scheme := "http"
	if req.TLS != nil {
		scheme = "https"
	}
	if proto := req.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}

	site.Endpoint = scheme + "://" + req.Host
	_, _ = UpdateSite("admin/site-built-in", site)
}
