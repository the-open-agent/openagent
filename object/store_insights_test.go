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
	"testing"
	"time"
)

func TestResolvePeriod(t *testing.T) {
	cases := []struct {
		in         string
		wantN      int
		wantUnit   time.Duration
		wantErr    bool
		wantDurTot time.Duration
	}{
		{"24h", 24, time.Hour, false, 24 * time.Hour},
		{"7d", 7, 24 * time.Hour, false, 7 * 24 * time.Hour},
		{"30d", 30, 24 * time.Hour, false, 30 * 24 * time.Hour},
		{"", 0, 0, true, 0},
		{"1h", 0, 0, true, 0},
		{"14d", 0, 0, true, 0},
	}
	for _, c := range cases {
		spec, err := resolvePeriod(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("resolvePeriod(%q): expected error, got spec=%+v", c.in, spec)
			}
			continue
		}
		if err != nil {
			t.Errorf("resolvePeriod(%q): unexpected error %v", c.in, err)
			continue
		}
		if spec.bucketN != c.wantN {
			t.Errorf("resolvePeriod(%q): bucketN=%d want %d", c.in, spec.bucketN, c.wantN)
		}
		if spec.bucketUnit != c.wantUnit {
			t.Errorf("resolvePeriod(%q): bucketUnit=%v want %v", c.in, spec.bucketUnit, c.wantUnit)
		}
		if spec.duration != c.wantDurTot {
			t.Errorf("resolvePeriod(%q): duration=%v want %v", c.in, spec.duration, c.wantDurTot)
		}
	}
}

func TestBucketIndex(t *testing.T) {
	start := time.Date(2026, 6, 24, 0, 0, 0, 0, time.UTC)
	dayUnit := 24 * time.Hour
	n := 7

	cases := []struct {
		name string
		t    time.Time
		want int
	}{
		{"before window", start.Add(-time.Hour), -1},
		{"exact start", start, 0},
		{"mid day 0", start.Add(12 * time.Hour), 0},
		{"start day 1", start.Add(dayUnit), 1},
		{"start day 6", start.Add(6 * dayUnit), 6},
		{"last second of window", start.Add(7 * dayUnit).Add(-time.Second), 6},
		{"exactly end (out)", start.Add(7 * dayUnit), -1},
		{"after window", start.Add(8 * dayUnit), -1},
	}
	for _, c := range cases {
		got := bucketIndex(c.t, start, dayUnit, n)
		if got != c.want {
			t.Errorf("bucketIndex(%s): got %d want %d", c.name, got, c.want)
		}
	}
}
