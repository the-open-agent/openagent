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
	"image/color"
	"testing"
)

func TestMixColorPreservesAlpha(t *testing.T) {
	c1 := color.RGBA{R: 0, G: 0, B: 0, A: 0xff}
	c2 := color.RGBA{R: 255, G: 255, B: 255, A: 0xff}

	res := MixColor(c1, c2, 0.5)
	if res.A != 0xff {
		t.Fatalf("MixColor of two opaque colors must stay opaque, got A=%d", res.A)
	}
}

func TestMixColorBlendsAlpha(t *testing.T) {
	c1 := color.RGBA{R: 10, G: 20, B: 30, A: 0}
	c2 := color.RGBA{R: 40, G: 50, B: 60, A: 200}

	if got := MixColor(c1, c2, 0).A; got != 0 {
		t.Fatalf("MixColor with t=0 should keep c1 alpha (0), got A=%d", got)
	}
	if got := MixColor(c1, c2, 1).A; got != 200 {
		t.Fatalf("MixColor with t=1 should keep c2 alpha (200), got A=%d", got)
	}
	if got := MixColor(c1, c2, 0.5).A; got != 100 {
		t.Fatalf("MixColor with t=0.5 should blend alpha to 100, got A=%d", got)
	}
}
